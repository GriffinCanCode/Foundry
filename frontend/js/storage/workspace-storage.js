/**
 * workspace-storage.js - Workspace-specific storage implementation
 * 
 * This module provides workspace-specific storage operations that leverage
 * the core storage manager for persistence.
 */

import { 
  initializeStorage, 
  saveData, 
  loadData, 
  deleteData, 
  listData,
  syncWithBackend,
  StorageStrategy
} from './storage-manager.js';

// Store type for workspaces
const STORE_TYPE = 'workspaces';

// Initialize workspace storage
export async function initializeWorkspaceStorage(options = {}) {
  await initializeStorage(options);
}

/**
 * Save a workspace to storage
 * 
 * @param {Object} workspace - The workspace to save
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status and id
 */
export async function saveWorkspace(workspace, options = {}) {
  if (!workspace.id) {
    workspace.id = 'ws_' + Date.now();
  }
  
  // Ensure timestamps are set
  workspace.updatedAt = new Date().toISOString();
  if (!workspace.createdAt) {
    workspace.createdAt = workspace.updatedAt;
  }
  
  return await saveData(STORE_TYPE, workspace, options);
}

/**
 * Load a workspace from storage
 * 
 * @param {string} id - The workspace ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The workspace
 */
export async function loadWorkspace(id, options = {}) {
  return await loadData(STORE_TYPE, id, options);
}

/**
 * Delete a workspace from storage
 * 
 * @param {string} id - The workspace ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status
 */
export async function deleteWorkspace(id, options = {}) {
  return await deleteData(STORE_TYPE, id, options);
}

/**
 * List all workspaces in storage
 * 
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Array>} - Array of workspaces
 */
export async function listWorkspaces(options = {}) {
  return await listData(STORE_TYPE, options);
}

/**
 * Get the currently selected workspace
 * 
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object|null>} - The current workspace or null if none selected
 */
export async function getCurrentWorkspace(options = {}) {
  try {
    // First check if there's a persisted current workspace
    const settings = await loadData('settings', 'app-settings', options);
    
    if (settings && settings.currentWorkspaceId) {
      try {
        return await loadWorkspace(settings.currentWorkspaceId, options);
      } catch (error) {
        console.warn('Current workspace not found:', error);
      }
    }
    
    // If no current workspace or not found, return first available or create default
    const workspaces = await listWorkspaces(options);
    
    if (workspaces.length > 0) {
      return workspaces[0];
    } else {
      // Create default workspace if none exist
      const defaultWorkspace = {
        id: 'default',
        name: 'Default Workspace',
        description: 'Default workspace',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await saveWorkspace(defaultWorkspace, options);
      return defaultWorkspace;
    }
  } catch (error) {
    console.error('Error getting current workspace:', error);
    return null;
  }
}

/**
 * Set the current workspace
 * 
 * @param {string} workspaceId - The workspace ID to set as current
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The current workspace
 */
export async function setCurrentWorkspace(workspaceId, options = {}) {
  try {
    // First verify the workspace exists
    const workspace = await loadWorkspace(workspaceId, options);
    
    if (!workspace) {
      throw new Error(`Workspace with ID ${workspaceId} not found`);
    }
    
    // Update settings
    let settings;
    try {
      settings = await loadData('settings', 'app-settings', options);
    } catch (error) {
      // Create settings if not found
      settings = { id: 'app-settings' };
    }
    
    settings.currentWorkspaceId = workspaceId;
    settings.updatedAt = new Date().toISOString();
    
    await saveData('settings', settings, options);
    
    return workspace;
  } catch (error) {
    console.error('Error setting current workspace:', error);
    throw error;
  }
}

/**
 * Force synchronization of workspaces with backend
 * 
 * @returns {Promise<Object>} - Sync result
 */
export async function syncWorkspaces() {
  return await syncWithBackend();
} 