/**
 * storage-manager.js - Core data persistence and storage management
 * 
 * This module provides a unified interface for data storage operations,
 * with configurable storage backends and improved reliability.
 */

// Supported storage strategies
const STORAGE_STRATEGY = {
  LOCAL: 'local',     // Use localStorage/IndexedDB
  BACKEND: 'backend', // Use backend APIs via IPC
  HYBRID: 'hybrid'    // Use local for caching + backend for persistence
};

// Default storage configuration
const DEFAULT_CONFIG = {
  strategy: STORAGE_STRATEGY.HYBRID,
  retryAttempts: 3,
  retryDelay: 1000,  // ms
  enableCompression: false,
  enableEncryption: false,
  autoSync: true,
  syncInterval: 30000, // 30s
};

// Storage manager state
let config = { ...DEFAULT_CONFIG };
let syncTimer = null;
let pendingOperations = [];
let isInitialized = false;

// Initialize the storage system
export async function initializeStorage(customConfig = {}) {
  if (isInitialized) return;
  
  // Merge custom config with defaults
  config = { ...DEFAULT_CONFIG, ...customConfig };
  
  // Initialize backend connection if using backend or hybrid
  if (config.strategy !== STORAGE_STRATEGY.LOCAL) {
    // Check if backend is available
    try {
      const isBackendAvailable = await checkBackendConnection();
      if (!isBackendAvailable && config.strategy === STORAGE_STRATEGY.BACKEND) {
        console.warn('Backend unavailable, falling back to local storage');
        config.strategy = STORAGE_STRATEGY.LOCAL;
      }
    } catch (error) {
      console.error('Error checking backend connection:', error);
      if (config.strategy === STORAGE_STRATEGY.BACKEND) {
        config.strategy = STORAGE_STRATEGY.LOCAL;
      }
    }
  }
  
  // Setup auto-sync if enabled
  if (config.autoSync && config.strategy === STORAGE_STRATEGY.HYBRID) {
    startAutoSync();
  }
  
  // Initialize IndexedDB for local storage if needed
  if (config.strategy !== STORAGE_STRATEGY.BACKEND) {
    await initializeLocalStorage();
  }
  
  isInitialized = true;
  console.log(`Storage initialized with strategy: ${config.strategy}`);
  
  // Process any pending operations
  if (pendingOperations.length > 0) {
    processPendingOperations();
  }
}

// Initialize IndexedDB storage
async function initializeLocalStorage() {
  // We'll use IndexedDB for more robust local storage
  try {
    const db = await openDatabase();
    console.log('IndexedDB initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

// Open/create the IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FoundryData', 1);
    
    request.onerror = (event) => {
      reject(new Error('Failed to open IndexedDB'));
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for different data types
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('syncState')) {
        db.createObjectStore('syncState', { keyPath: 'id' });
      }
    };
  });
}

// Check if backend connection is available
async function checkBackendConnection() {
  try {
    // Try to call a simple API to check if backend is responsive
    if (window.foundryAPI) {
      const result = await window.foundryAPI.loadSettings();
      return result.success === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking backend connection:', error);
    return false;
  }
}

// Start auto-sync timer
function startAutoSync() {
  // Clear any existing timer
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  
  // Setup new timer
  syncTimer = setInterval(() => {
    syncWithBackend()
      .catch(error => console.error('Auto-sync failed:', error));
  }, config.syncInterval);
}

// Stop auto-sync timer
export function stopAutoSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

// Process any pending operations
async function processPendingOperations() {
  if (pendingOperations.length === 0) return;
  
  const ops = [...pendingOperations];
  pendingOperations = [];
  
  for (const op of ops) {
    try {
      if (op.type === 'save') {
        await saveData(op.storeType, op.data);
      } else if (op.type === 'delete') {
        await deleteData(op.storeType, op.id);
      }
    } catch (error) {
      console.error(`Failed to process pending operation:`, op, error);
      // Add back to pending queue if this is a retriable error
      if (isRetriableError(error)) {
        pendingOperations.push(op);
      }
    }
  }
}

// Determine if an error is retriable
function isRetriableError(error) {
  // Network errors, timeouts, and temporary server errors are retriable
  return (
    error.name === 'NetworkError' ||
    error.message.includes('timeout') ||
    error.message.includes('temporarily unavailable') ||
    (error.status && (error.status >= 500 || error.status === 429))
  );
}

// CORE DATA OPERATIONS

// Save data with appropriate strategy
export async function saveData(storeType, data, options = {}) {
  if (!isInitialized) {
    // Queue the operation for after initialization
    pendingOperations.push({ type: 'save', storeType, data });
    await initializeStorage();
    return;
  }
  
  const mergedOptions = { ...config, ...options };
  
  try {
    // Pre-process data if needed (compression, encryption)
    const processedData = preprocessData(data, mergedOptions);
    
    if (config.strategy === STORAGE_STRATEGY.LOCAL || config.strategy === STORAGE_STRATEGY.HYBRID) {
      // Save to local storage first
      await saveToLocalStorage(storeType, processedData);
    }
    
    if (config.strategy === STORAGE_STRATEGY.BACKEND || config.strategy === STORAGE_STRATEGY.HYBRID) {
      // Save to backend
      await saveToBackend(storeType, processedData);
    }
    
    // If using hybrid strategy, mark as synced in local storage
    if (config.strategy === STORAGE_STRATEGY.HYBRID) {
      await markAsSynced(storeType, data.id);
    }
    
    return { success: true, id: data.id };
  } catch (error) {
    console.error(`Error saving ${storeType}:`, error);
    
    // If backend save failed but local succeeded in hybrid mode, queue for retry
    if (config.strategy === STORAGE_STRATEGY.HYBRID && error.source === 'backend') {
      queueForSync(storeType, data.id);
    }
    
    // If backend-only strategy failed, attempt to fall back to local
    if (config.strategy === STORAGE_STRATEGY.BACKEND) {
      try {
        await saveToLocalStorage(storeType, data);
        queueForSync(storeType, data.id);
        return { success: true, id: data.id, warning: 'Saved to local storage only' };
      } catch (localError) {
        throw new Error(`Failed to save data: ${error.message}`);
      }
    }
    
    throw error;
  }
}

// Load data with appropriate strategy
export async function loadData(storeType, id, options = {}) {
  if (!isInitialized) {
    await initializeStorage();
  }
  
  const mergedOptions = { ...config, ...options };
  
  try {
    let data = null;
    
    if (config.strategy === STORAGE_STRATEGY.LOCAL) {
      // Load from local storage only
      data = await loadFromLocalStorage(storeType, id);
    } else if (config.strategy === STORAGE_STRATEGY.BACKEND) {
      // Try to load from backend
      try {
        data = await loadFromBackend(storeType, id);
      } catch (error) {
        // If backend fails in backend-only mode, try local as fallback
        console.warn(`Backend load failed, trying local fallback:`, error);
        data = await loadFromLocalStorage(storeType, id);
      }
    } else if (config.strategy === STORAGE_STRATEGY.HYBRID) {
      // In hybrid mode, check local first for performance
      try {
        data = await loadFromLocalStorage(storeType, id);
        
        // If we have newer data on the backend, get that instead
        const syncState = await getSyncState(storeType, id);
        if (!syncState || !syncState.synced) {
          try {
            const backendData = await loadFromBackend(storeType, id);
            if (backendData && (!data || new Date(backendData.updatedAt) > new Date(data.updatedAt))) {
              data = backendData;
              // Update local copy with the newer backend data
              await saveToLocalStorage(storeType, data);
              await markAsSynced(storeType, id);
            }
          } catch (backendError) {
            console.warn('Could not load from backend in hybrid mode', backendError);
          }
        }
      } catch (localError) {
        // If local fails in hybrid mode, try backend
        console.warn(`Local load failed in hybrid mode, trying backend:`, localError);
        data = await loadFromBackend(storeType, id);
        
        // If backend data was found, update local copy
        if (data) {
          await saveToLocalStorage(storeType, data);
          await markAsSynced(storeType, id);
        }
      }
    }
    
    if (!data) {
      throw new Error(`${storeType} with id ${id} not found`);
    }
    
    // Post-process data if needed (decompression, decryption)
    return postprocessData(data, mergedOptions);
  } catch (error) {
    console.error(`Error loading ${storeType}:`, error);
    throw error;
  }
}

// Delete data with appropriate strategy
export async function deleteData(storeType, id, options = {}) {
  if (!isInitialized) {
    // Queue the operation for after initialization
    pendingOperations.push({ type: 'delete', storeType, id });
    await initializeStorage();
    return;
  }
  
  const mergedOptions = { ...config, ...options };
  
  try {
    if (config.strategy === STORAGE_STRATEGY.LOCAL || config.strategy === STORAGE_STRATEGY.HYBRID) {
      // Delete from local storage
      await deleteFromLocalStorage(storeType, id);
    }
    
    if (config.strategy === STORAGE_STRATEGY.BACKEND || config.strategy === STORAGE_STRATEGY.HYBRID) {
      // Delete from backend
      await deleteFromBackend(storeType, id);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting ${storeType}:`, error);
    
    // If backend delete failed but local succeeded in hybrid mode, mark for deletion on next sync
    if (config.strategy === STORAGE_STRATEGY.HYBRID && error.source === 'backend') {
      await markForDeletion(storeType, id);
    }
    
    throw error;
  }
}

// List all items of a specific type
export async function listData(storeType, options = {}) {
  if (!isInitialized) {
    await initializeStorage();
  }
  
  const mergedOptions = { ...config, ...options };
  
  try {
    let items = [];
    
    if (config.strategy === STORAGE_STRATEGY.LOCAL) {
      // List from local storage only
      items = await listFromLocalStorage(storeType);
    } else if (config.strategy === STORAGE_STRATEGY.BACKEND) {
      // Try to list from backend
      try {
        items = await listFromBackend(storeType);
      } catch (error) {
        // If backend fails in backend-only mode, try local as fallback
        console.warn(`Backend list failed, trying local fallback:`, error);
        items = await listFromLocalStorage(storeType);
      }
    } else if (config.strategy === STORAGE_STRATEGY.HYBRID) {
      // In hybrid mode, merge local and backend data
      const localItems = await listFromLocalStorage(storeType);
      let backendItems = [];
      
      try {
        backendItems = await listFromBackend(storeType);
        
        // Get items that exist in both local and backend storage
        const localIds = new Set(localItems.map(item => item.id));
        const backendIds = new Set(backendItems.map(item => item.id));
        
        // Use backend items as source of truth for shared items
        const mergedItems = [];
        
        // Add or update items from backend
        for (const item of backendItems) {
          mergedItems.push(item);
          
          // Update local copy if needed
          if (localIds.has(item.id)) {
            const localItem = localItems.find(li => li.id === item.id);
            if (new Date(item.updatedAt) > new Date(localItem.updatedAt)) {
              await saveToLocalStorage(storeType, item);
              await markAsSynced(storeType, item.id);
            }
          } else {
            await saveToLocalStorage(storeType, item);
            await markAsSynced(storeType, item.id);
          }
        }
        
        // Add local-only items
        for (const item of localItems) {
          if (!backendIds.has(item.id)) {
            const syncState = await getSyncState(storeType, item.id);
            
            // Skip deleted items
            if (syncState && syncState.pendingDelete) {
              continue;
            }
            
            mergedItems.push(item);
            
            // Queue local-only items for sync
            if (!syncState || !syncState.synced) {
              queueForSync(storeType, item.id);
            }
          }
        }
        
        items = mergedItems;
      } catch (backendError) {
        console.warn('Could not list from backend in hybrid mode', backendError);
        items = localItems;
      }
    }
    
    // Post-process each item if needed
    return items.map(item => postprocessData(item, mergedOptions));
  } catch (error) {
    console.error(`Error listing ${storeType}:`, error);
    throw error;
  }
}

// BACKEND STORAGE OPERATIONS

// Save data to backend
async function saveToBackend(storeType, data) {
  try {
    if (!window.foundryAPI) {
      throw new Error('Backend API not available');
    }
    
    let result;
    
    // Call appropriate API based on store type
    switch (storeType) {
      case 'documents':
        result = await window.foundryAPI.saveDocument(data);
        break;
      case 'workspaces':
        result = await window.foundryAPI.createWorkspace(data);
        break;
      case 'databases':
        result = await window.foundryAPI.createDatabase(data);
        break;
      case 'settings':
        result = await window.foundryAPI.saveSettings(data);
        break;
      default:
        throw new Error(`Unsupported store type: ${storeType}`);
    }
    
    if (!result || !result.success) {
      const error = new Error(result?.error || `Failed to save ${storeType} to backend`);
      error.source = 'backend';
      throw error;
    }
    
    return result;
  } catch (error) {
    error.source = 'backend';
    throw error;
  }
}

// Load data from backend
async function loadFromBackend(storeType, id) {
  try {
    if (!window.foundryAPI) {
      throw new Error('Backend API not available');
    }
    
    let result;
    
    // Call appropriate API based on store type
    switch (storeType) {
      case 'documents':
        result = await window.foundryAPI.loadDocument(id);
        return result.success ? result.document : null;
      case 'workspaces':
        result = await window.foundryAPI.getWorkspace(id);
        return result.success ? result.workspace : null;
      case 'databases':
        // Assuming there's a getDatabase method in the API
        result = await window.foundryAPI.queryDatabase(id, { type: 'getInfo' });
        return result.success ? result.database : null;
      case 'settings':
        result = await window.foundryAPI.loadSettings();
        return result.success ? result.settings : null;
      default:
        throw new Error(`Unsupported store type: ${storeType}`);
    }
  } catch (error) {
    error.source = 'backend';
    throw error;
  }
}

// Delete data from backend
async function deleteFromBackend(storeType, id) {
  try {
    if (!window.foundryAPI) {
      throw new Error('Backend API not available');
    }
    
    let result;
    
    // Call appropriate API based on store type
    switch (storeType) {
      case 'documents':
        result = await window.foundryAPI.deleteDocument(id);
        break;
      case 'workspaces':
        // Assuming there's a deleteWorkspace method in the API
        result = await window.foundryAPI.deleteWorkspace(id);
        break;
      case 'databases':
        // Assuming there's a deleteDatabase method in the API
        result = await window.foundryAPI.deleteDatabase(id);
        break;
      default:
        throw new Error(`Unsupported delete operation for store type: ${storeType}`);
    }
    
    if (!result || !result.success) {
      const error = new Error(result?.error || `Failed to delete ${storeType} from backend`);
      error.source = 'backend';
      throw error;
    }
    
    return result;
  } catch (error) {
    error.source = 'backend';
    throw error;
  }
}

// List data from backend
async function listFromBackend(storeType) {
  try {
    if (!window.foundryAPI) {
      throw new Error('Backend API not available');
    }
    
    let result;
    
    // Call appropriate API based on store type
    switch (storeType) {
      case 'documents':
        result = await window.foundryAPI.listDocuments();
        return result.success ? result.documents : [];
      case 'workspaces':
        result = await window.foundryAPI.listWorkspaces();
        return result.success ? result.workspaces : [];
      case 'databases':
        result = await window.foundryAPI.listDatabases();
        return result.success ? result.databases : [];
      default:
        throw new Error(`Unsupported list operation for store type: ${storeType}`);
    }
  } catch (error) {
    error.source = 'backend';
    throw error;
  }
}

// LOCAL STORAGE OPERATIONS (IndexedDB)

// Save data to local storage
async function saveToLocalStorage(storeType, data) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeType], 'readwrite');
      const store = transaction.objectStore(storeType);
      
      const request = store.put(data);
      
      request.onerror = () => {
        const error = new Error(`Failed to save ${storeType} to local storage`);
        error.source = 'local';
        reject(error);
      };
      
      request.onsuccess = () => {
        resolve({ success: true, id: data.id });
      };
    });
  } catch (error) {
    error.source = 'local';
    throw error;
  }
}

// Load data from local storage
async function loadFromLocalStorage(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeType], 'readonly');
      const store = transaction.objectStore(storeType);
      
      const request = store.get(id);
      
      request.onerror = () => {
        const error = new Error(`Failed to load ${storeType} from local storage`);
        error.source = 'local';
        reject(error);
      };
      
      request.onsuccess = (event) => {
        resolve(request.result);
      };
    });
  } catch (error) {
    error.source = 'local';
    throw error;
  }
}

// Delete data from local storage
async function deleteFromLocalStorage(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeType], 'readwrite');
      const store = transaction.objectStore(storeType);
      
      const request = store.delete(id);
      
      request.onerror = () => {
        const error = new Error(`Failed to delete ${storeType} from local storage`);
        error.source = 'local';
        reject(error);
      };
      
      request.onsuccess = () => {
        resolve({ success: true });
      };
    });
  } catch (error) {
    error.source = 'local';
    throw error;
  }
}

// List data from local storage
async function listFromLocalStorage(storeType) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeType], 'readonly');
      const store = transaction.objectStore(storeType);
      
      const request = store.getAll();
      
      request.onerror = () => {
        const error = new Error(`Failed to list ${storeType} from local storage`);
        error.source = 'local';
        reject(error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    error.source = 'local';
    throw error;
  }
}

// SYNC STATE MANAGEMENT

// Mark an item as synced in local storage
async function markAsSynced(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncState'], 'readwrite');
      const store = transaction.objectStore('syncState');
      
      const syncData = {
        id: `${storeType}:${id}`,
        storeType,
        itemId: id,
        synced: true,
        pendingDelete: false,
        syncedAt: new Date().toISOString()
      };
      
      const request = store.put(syncData);
      
      request.onerror = () => {
        reject(new Error(`Failed to mark ${storeType}:${id} as synced`));
      };
      
      request.onsuccess = () => {
        resolve({ success: true });
      };
    });
  } catch (error) {
    console.error('Error marking as synced:', error);
    throw error;
  }
}

// Mark an item for deletion on next sync
async function markForDeletion(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncState'], 'readwrite');
      const store = transaction.objectStore('syncState');
      
      const syncData = {
        id: `${storeType}:${id}`,
        storeType,
        itemId: id,
        synced: false,
        pendingDelete: true,
        syncedAt: null
      };
      
      const request = store.put(syncData);
      
      request.onerror = () => {
        reject(new Error(`Failed to mark ${storeType}:${id} for deletion`));
      };
      
      request.onsuccess = () => {
        resolve({ success: true });
      };
    });
  } catch (error) {
    console.error('Error marking for deletion:', error);
    throw error;
  }
}

// Get sync state for an item
async function getSyncState(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncState'], 'readonly');
      const store = transaction.objectStore('syncState');
      
      const request = store.get(`${storeType}:${id}`);
      
      request.onerror = () => {
        reject(new Error(`Failed to get sync state for ${storeType}:${id}`));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting sync state:', error);
    return null;
  }
}

// Queue an item for sync
async function queueForSync(storeType, id) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncState'], 'readwrite');
      const store = transaction.objectStore('syncState');
      
      // Get existing sync state or create new one
      const getRequest = store.get(`${storeType}:${id}`);
      
      getRequest.onerror = () => {
        reject(new Error(`Failed to get sync state for ${storeType}:${id}`));
      };
      
      getRequest.onsuccess = () => {
        const syncData = getRequest.result || {
          id: `${storeType}:${id}`,
          storeType,
          itemId: id
        };
        
        syncData.synced = false;
        syncData.pendingDelete = syncData.pendingDelete || false;
        syncData.queuedAt = new Date().toISOString();
        
        const putRequest = store.put(syncData);
        
        putRequest.onerror = () => {
          reject(new Error(`Failed to queue ${storeType}:${id} for sync`));
        };
        
        putRequest.onsuccess = () => {
          resolve({ success: true });
        };
      };
    });
  } catch (error) {
    console.error('Error queueing for sync:', error);
    throw error;
  }
}

// Synchronize with backend
export async function syncWithBackend() {
  if (config.strategy !== STORAGE_STRATEGY.HYBRID) return;
  
  try {
    const db = await openDatabase();
    
    // Get all items that need to be synced
    const pendingSyncs = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncState'], 'readonly');
      const store = transaction.objectStore('syncState');
      
      const request = store.getAll();
      
      request.onerror = () => {
        reject(new Error('Failed to get pending syncs'));
      };
      
      request.onsuccess = () => {
        // Filter for unsynced items
        resolve(request.result.filter(item => !item.synced));
      };
    });
    
    // Process each pending sync
    for (const sync of pendingSyncs) {
      try {
        if (sync.pendingDelete) {
          // Delete from backend
          await deleteFromBackend(sync.storeType, sync.itemId);
          // Remove from sync state
          await deleteFromLocalStorage('syncState', sync.id);
        } else {
          // Load the item from local storage
          const item = await loadFromLocalStorage(sync.storeType, sync.itemId);
          if (item) {
            // Save to backend
            await saveToBackend(sync.storeType, item);
            // Mark as synced
            await markAsSynced(sync.storeType, sync.itemId);
          } else {
            // Item no longer exists locally, remove from sync state
            await deleteFromLocalStorage('syncState', sync.id);
          }
        }
      } catch (error) {
        console.error(`Failed to sync ${sync.storeType}:${sync.itemId}:`, error);
        // Leave in pending state for next sync
      }
    }
    
    return { success: true, pendingSyncs };
  } catch (error) {
    console.error('Error syncing with backend:', error);
    throw error;
  }
}

// DATA PROCESSING

// Pre-process data before storage
function preprocessData(data, options) {
  let processedData = { ...data };
  
  // Add timestamps if not present
  if (!processedData.updatedAt) {
    processedData.updatedAt = new Date().toISOString();
  }
  if (!processedData.createdAt) {
    processedData.createdAt = new Date().toISOString();
  }
  
  // Apply compression if enabled
  if (options.enableCompression) {
    // Implement compression logic here
    // This is a placeholder - would use a library like lz-string in production
  }
  
  // Apply encryption if enabled
  if (options.enableEncryption) {
    // Implement encryption logic here
    // This is a placeholder - would use a library like CryptoJS in production
  }
  
  return processedData;
}

// Post-process data after retrieval
function postprocessData(data, options) {
  if (!data) return data;
  
  let processedData = { ...data };
  
  // Apply decryption if enabled
  if (options.enableEncryption) {
    // Implement decryption logic here
    // This is a placeholder - would use a library like CryptoJS in production
  }
  
  // Apply decompression if enabled
  if (options.enableCompression) {
    // Implement decompression logic here
    // This is a placeholder - would use a library like lz-string in production
  }
  
  return processedData;
}

// Export storage strategy constants for use in other modules
export const StorageStrategy = STORAGE_STRATEGY; 