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
  StorageStrategy,
} from "./storage-manager.js";

// Store type for workspaces
const STORE_TYPE = "workspaces";

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
  try {
    if (!workspace.id) {
      workspace.id = "ws_" + Date.now();
    }

    // Create a clean copy to avoid circular references or undefined values
    const cleanWorkspace = { ...workspace };

    // Ensure timestamps are set properly
    cleanWorkspace.updatedAt = new Date().toISOString();
    cleanWorkspace.updated = new Date().toISOString(); // For backward compatibility
    
    if (!cleanWorkspace.createdAt) {
      cleanWorkspace.createdAt = cleanWorkspace.updatedAt;
    }
    if (!cleanWorkspace.created) {
      cleanWorkspace.created = cleanWorkspace.updatedAt; // For backward compatibility
    }

    // Ensure name is set
    if (!cleanWorkspace.name) {
      cleanWorkspace.name = 'Untitled Workspace';
    }

    // Remove any null or undefined properties
    Object.keys(cleanWorkspace).forEach(key => {
      if (cleanWorkspace[key] === undefined || cleanWorkspace[key] === null) {
        delete cleanWorkspace[key];
      }
    });

    console.log('Saving workspace with ID:', cleanWorkspace.id, 'Name:', cleanWorkspace.name);
    
    const result = await saveData(STORE_TYPE, cleanWorkspace, options);
    console.log('Workspace saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving workspace:', error);
    throw error;
  }
}

/**
 * Load a workspace from storage
 *
 * @param {string} id - The workspace ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The workspace
 */
export async function loadWorkspace(id, options = {}) {
  try {
    console.log('Loading workspace with ID:', id);
    const workspace = await loadData(STORE_TYPE, id, options);
    
    // Ensure the workspace has all required properties
    if (!workspace.name) {
      workspace.name = 'Untitled Workspace';
    }
    
    // Ensure consistent timestamps
    if (!workspace.updated && workspace.updatedAt) {
      workspace.updated = workspace.updatedAt;
    }
    if (!workspace.created && workspace.createdAt) {
      workspace.created = workspace.createdAt;
    }
    
    console.log('Workspace loaded successfully:', workspace.name);
    return workspace;
  } catch (error) {
    console.error('Error loading workspace:', error);
    throw error;
  }
}

/**
 * Delete a workspace from storage
 *
 * @param {string} id - The workspace ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status
 */
export async function deleteWorkspace(id, options = {}) {
  try {
    console.log('Deleting workspace with ID:', id);
    const result = await deleteData(STORE_TYPE, id, options);
    console.log('Workspace deleted successfully');
    return result;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
}

/**
 * List all workspaces in storage
 *
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Array>} - Array of workspaces
 */
export async function listWorkspaces(options = {}) {
  try {
    const workspaces = await listData(STORE_TYPE, options);
    
    if (!workspaces || !Array.isArray(workspaces)) {
      console.warn('Invalid workspace list returned from storage');
      return [];
    }
    
    // Validate and repair workspaces if needed
    const validatedWorkspaces = workspaces.map(ws => {
      if (!ws || !ws.id) {
        console.warn('Invalid workspace found, skipping');
        return null;
      }
      
      // Create a clean copy
      const validWs = { ...ws };
      
      // Fix any missing metadata
      if (!validWs.name) validWs.name = 'Untitled Workspace';
      
      // Normalize timestamps
      if (!validWs.updated && validWs.updatedAt) validWs.updated = validWs.updatedAt;
      if (!validWs.created && validWs.createdAt) validWs.created = validWs.createdAt;
      
      return validWs;
    }).filter(Boolean); // Remove null entries
    
    console.log(`Retrieved ${validatedWorkspaces.length} workspaces`);
    return validatedWorkspaces;
  } catch (error) {
    console.error('Error listing workspaces:', error);
    return [];
  }
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
    let currentWorkspaceId = null;

    try {
      // Try to load settings
      const settings = await loadData("settings", "app-settings", options);

      if (settings && settings.currentWorkspaceId) {
        currentWorkspaceId = settings.currentWorkspaceId;
      }
    } catch (error) {
      console.warn(
        "Could not load settings, will use default workspace:",
        error.message
      );
    }

    // If we have a workspace ID, try to load that workspace
    if (currentWorkspaceId) {
      try {
        const workspace = await loadWorkspace(currentWorkspaceId, options);
        if (workspace) {
          console.log('Loaded current workspace:', workspace.name);
          return workspace;
        }
      } catch (error) {
        console.warn(
          `Current workspace ${currentWorkspaceId} not found:`,
          error.message
        );
      }
    }

    // If no current workspace or not found, return first available or create default
    try {
      const workspaces = await listWorkspaces(options);

      if (workspaces && workspaces.length > 0) {
        console.log('Using first available workspace:', workspaces[0].name);
        return workspaces[0];
      }
    } catch (error) {
      console.warn("Could not list workspaces:", error.message);
    }

    // Create default workspace if none exist
    try {
      console.log('Creating default workspace');
      const defaultWorkspace = {
        id: "default",
        name: "Default Workspace",
        description: "Default workspace",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      await saveWorkspace(defaultWorkspace, options);
      return defaultWorkspace;
    } catch (error) {
      console.error("Error creating default workspace:", error);
      return null;
    }
  } catch (error) {
    console.error("Error getting current workspace:", error);
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
    console.log('Setting current workspace to:', workspaceId);
    
    // First verify the workspace exists
    const workspace = await loadWorkspace(workspaceId, options);

    if (!workspace) {
      throw new Error(`Workspace with ID ${workspaceId} not found`);
    }

    // Update settings
    let settings;
    try {
      settings = await loadData("settings", "app-settings", options);
    } catch (error) {
      // Create settings if not found
      settings = { id: "app-settings" };
    }

    settings.currentWorkspaceId = workspaceId;
    settings.updatedAt = new Date().toISOString();

    await saveData("settings", settings, options);
    console.log('Current workspace updated successfully:', workspace.name);

    return workspace;
  } catch (error) {
    console.error("Error setting current workspace:", error);
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

/**
 * Repair and validate all workspace data
 * 
 * This performs a full scan of stored workspaces, fixing any corruption or missing data.
 * 
 * @returns {Promise<Object>} - Results of the repair operation
 */
export async function repairWorkspaceData() {
  try {
    console.log('Starting workspace data repair process...');
    const startTime = Date.now();
    
    // Get all workspaces without filtering
    const allWorkspaces = await listData(STORE_TYPE, { bypassCache: true });
    
    if (!allWorkspaces || !Array.isArray(allWorkspaces)) {
      throw new Error('Failed to retrieve workspaces');
    }
    
    console.log(`Found ${allWorkspaces.length} workspaces to check`);
    
    // Track repair statistics
    const stats = {
      total: allWorkspaces.length,
      repaired: 0,
      failed: 0,
      nameFixed: 0,
      timestampFixed: 0,
      errors: []
    };
    
    // Process each workspace
    for (const ws of allWorkspaces) {
      try {
        let needsRepair = false;
        let repairs = [];
        
        // Create a clean copy for repairs
        const repairedWs = { ...ws };
        
        // Fix missing name
        if (!repairedWs.name) {
          repairedWs.name = 'Untitled Workspace';
          needsRepair = true;
          repairs.push('fixed missing name');
          stats.nameFixed++;
        }
        
        // Fix timestamp inconsistencies
        if (!repairedWs.updated || !repairedWs.updatedAt) {
          const timestamp = new Date().toISOString();
          repairedWs.updated = timestamp;
          repairedWs.updatedAt = timestamp;
          needsRepair = true;
          repairs.push('fixed timestamps');
          stats.timestampFixed++;
        }
        
        // If workspace needed repairs, save the fixed version
        if (needsRepair) {
          await saveData(STORE_TYPE, repairedWs, { silent: true });
          stats.repaired++;
          console.log(`Repaired workspace ${repairedWs.id}: ${repairs.join(', ')}`);
        }
      } catch (wsError) {
        console.error(`Error repairing workspace ${ws.id}:`, wsError);
        stats.failed++;
        stats.errors.push({
          id: ws.id,
          error: wsError.message
        });
      }
    }
    
    // Calculate timing
    const duration = Date.now() - startTime;
    stats.durationMs = duration;
    stats.durationSec = (duration / 1000).toFixed(2);
    
    console.log('Workspace repair complete:', stats);
    return stats;
  } catch (error) {
    console.error('Workspace repair process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
