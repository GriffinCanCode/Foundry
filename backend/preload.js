// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'foundryAPI',
  {
    // Workspace API
    listWorkspaces: () => ipcRenderer.invoke('list-workspaces'),
    createWorkspace: (workspaceData) => ipcRenderer.invoke('create-workspace', workspaceData),
    getWorkspace: (workspaceId) => ipcRenderer.invoke('get-workspace', workspaceId),
    selectWorkspace: (workspaceId) => ipcRenderer.invoke('select-workspace', workspaceId),
    getActiveWorkspace: () => ipcRenderer.invoke('get-active-workspace'),
    deleteWorkspace: (workspaceId) => ipcRenderer.invoke('delete-workspace', workspaceId),
    
    // Data Storage API
    saveDocument: (docData) => ipcRenderer.invoke('save-document', docData),
    loadDocument: (docId) => ipcRenderer.invoke('load-document', docId),
    listDocuments: () => ipcRenderer.invoke('list-documents'),
    deleteDocument: (docId) => ipcRenderer.invoke('delete-document', docId),
    searchDocuments: (query) => ipcRenderer.invoke('search-documents', query),
    
    // Settings API
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', key, defaultValue),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    
    // Synchronization API
    syncData: (dataType, dataIds) => ipcRenderer.invoke('sync-data', dataType, dataIds),
    syncWorkspace: (workspaceId) => ipcRenderer.invoke('sync-workspace', workspaceId),
    syncAll: () => ipcRenderer.invoke('sync-all'),
    getLastSyncTime: () => ipcRenderer.invoke('get-last-sync-time'),
    
    // Block-related APIs
    createBlock: (blockData) => ipcRenderer.invoke('create-block', blockData),
    updateBlock: (blockId, blockData) => ipcRenderer.invoke('update-block', blockId, blockData),
    deleteBlock: (blockId) => ipcRenderer.invoke('delete-block', blockId),
    
    // Database operations
    saveDatabase: (dbConfig) => ipcRenderer.invoke('save-database', dbConfig),
    loadDatabase: (dbId) => ipcRenderer.invoke('load-database', dbId),
    listDatabases: (workspaceId) => ipcRenderer.invoke('list-databases', workspaceId),
    deleteDatabase: (dbId) => ipcRenderer.invoke('delete-database', dbId),
    createDatabase: (dbConfig) => ipcRenderer.invoke('save-database', dbConfig), // Alias for saveDatabase
    updateDatabase: (dbId, dbConfig) => {
      // Combine ID with data for update
      const fullData = { ...dbConfig, id: dbId };
      return ipcRenderer.invoke('save-database', fullData);
    },
    queryDatabase: (dbId, query) => ipcRenderer.invoke('query-database', dbId, query),
    
    // Device and System Information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    
    // Offline Mode Management
    setOfflineMode: (enabled) => ipcRenderer.invoke('set-offline-mode', enabled),
    isOfflineMode: () => ipcRenderer.invoke('is-offline-mode'),
    
    // Receive notifications from main process
    onDocumentChanged: (callback) => ipcRenderer.on('document-changed', (_, ...args) => callback(...args)),
    onSyncComplete: (callback) => ipcRenderer.on('sync-complete', (_, ...args) => callback(...args)),
    onNetworkStatusChanged: (callback) => ipcRenderer.on('network-status-changed', (_, ...args) => callback(...args)),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, ...args) => callback(...args))
  }
);

window.addEventListener('DOMContentLoaded', () => {
  // You can expose Node.js functionality to the renderer process here if needed
  // For example:
  // window.api = {
  //   someFunction: () => { /* Code here */ }
  // }
  
  console.log('Foundry Block Editor loaded successfully!');
}); 