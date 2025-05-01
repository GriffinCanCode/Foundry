/**
 * database-storage.js - Database-specific storage implementation
 * 
 * This module provides database-specific storage operations that leverage
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

import { appState } from '../core/app-core.js';

// Store type for databases
const STORE_TYPE = 'databases';

// Initialize database storage
export async function initializeDatabaseStorage(options = {}) {
  await initializeStorage(options);
}

/**
 * Save a database to storage
 * 
 * @param {Object} database - The database to save
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status and id
 */
export async function saveDatabase(database, options = {}) {
  try {
    if (!database.id) {
      database.id = 'db_' + Date.now();
    }
    
    // Create a clean copy to avoid circular references or undefined values
    const cleanDatabase = { ...database };
    
    // Ensure timestamps are properly set
    cleanDatabase.updatedAt = new Date().toISOString();
    cleanDatabase.updated = new Date().toISOString(); // For backward compatibility
    
    if (!cleanDatabase.createdAt) {
      cleanDatabase.createdAt = cleanDatabase.updatedAt;
    }
    if (!cleanDatabase.created) {
      cleanDatabase.created = cleanDatabase.updatedAt; // For backward compatibility
    }
    
    // Ensure workspace association is properly set
    if (!cleanDatabase.workspaceId && appState.currentWorkspace) {
      cleanDatabase.workspaceId = appState.currentWorkspace.id;
    }

    // Ensure name is set
    if (!cleanDatabase.name) {
      cleanDatabase.name = 'Untitled Database';
    }

    // Ensure tables array exists
    if (!Array.isArray(cleanDatabase.tables)) {
      cleanDatabase.tables = [];
    }

    // Validate each table
    cleanDatabase.tables = cleanDatabase.tables.map(table => {
      // Create a clean copy of the table
      const cleanTable = { ...table };
      
      // Make sure each table has the necessary properties
      if (!cleanTable.id) {
        cleanTable.id = 'table_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      if (!cleanTable.name) {
        cleanTable.name = 'Untitled Table';
      }
      
      if (!cleanTable.columns || !Array.isArray(cleanTable.columns)) {
        cleanTable.columns = [];
      }
      
      if (!cleanTable.rows || !Array.isArray(cleanTable.rows)) {
        cleanTable.rows = [];
      }
      
      if (!cleanTable.createdAt) {
        cleanTable.createdAt = new Date().toISOString();
      }
      
      cleanTable.updatedAt = new Date().toISOString();
      
      // Ensure workspace association is present in each table
      cleanTable.workspaceId = cleanDatabase.workspaceId;
      
      return cleanTable;
    });
    
    // Remove any null or undefined values
    Object.keys(cleanDatabase).forEach(key => {
      if (cleanDatabase[key] === undefined || cleanDatabase[key] === null) {
        delete cleanDatabase[key];
      }
    });
    
    console.log('Saving database with ID:', cleanDatabase.id, 'Name:', cleanDatabase.name, 'Workspace:', cleanDatabase.workspaceId);
    
    const result = await saveData(STORE_TYPE, cleanDatabase, options);
    console.log('Database saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving database:', error);
    throw error;
  }
}

/**
 * Load a database from storage
 * 
 * @param {string} id - The database ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The database
 */
export async function loadDatabase(id, options = {}) {
  try {
    console.log('Loading database with ID:', id);
    const database = await loadData(STORE_TYPE, id, options);
    
    // Ensure the database has all required properties
    if (!database.workspaceId && appState.currentWorkspace) {
      database.workspaceId = appState.currentWorkspace.id;
      console.log('Added missing workspace ID to database:', database.workspaceId);
    }
    
    // Ensure consistent timestamps
    if (!database.updated && database.updatedAt) {
      database.updated = database.updatedAt;
    }
    if (!database.created && database.createdAt) {
      database.created = database.createdAt;
    }
    
    // Ensure tables array exists
    if (!Array.isArray(database.tables)) {
      database.tables = [];
    }
    
    console.log('Database loaded successfully:', database.name);
    return database;
  } catch (error) {
    console.error('Error loading database:', error);
    throw error;
  }
}

/**
 * Delete a database from storage
 * 
 * @param {string} id - The database ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status
 */
export async function deleteDatabase(id, options = {}) {
  try {
    console.log('Deleting database with ID:', id);
    const result = await deleteData(STORE_TYPE, id, options);
    console.log('Database deleted successfully');
    return result;
  } catch (error) {
    console.error('Error deleting database:', error);
    throw error;
  }
}

/**
 * List all databases in storage
 * 
 * @param {Object} filters - Optional filters to apply (e.g. workspace)
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Array>} - Array of databases
 */
export async function listDatabases(filters = {}, options = {}) {
  try {
    const databases = await listData(STORE_TYPE, options);
    
    // Validate and repair databases if needed
    const validatedDbs = databases.map(db => {
      // Create a clean copy to avoid modifying original cache
      const validDb = { ...db };
      
      // Ensure required properties exist
      if (!validDb.id) {
        console.warn('Database without ID found, skipping');
        return null;
      }
      
      // Fix any missing metadata
      if (!validDb.name) validDb.name = 'Untitled Database';
      if (!validDb.workspaceId && appState.currentWorkspace) {
        validDb.workspaceId = appState.currentWorkspace.id;
      }
      
      // Normalize timestamps
      if (!validDb.updated && validDb.updatedAt) validDb.updated = validDb.updatedAt;
      if (!validDb.created && validDb.createdAt) validDb.created = validDb.createdAt;
      
      // Ensure tables array exists
      if (!Array.isArray(validDb.tables)) {
        validDb.tables = [];
      }
      
      return validDb;
    }).filter(Boolean); // Remove null entries
    
    // Apply workspace filter if provided
    if (filters.workspaceId) {
      console.log(`Filtering databases by workspace: ${filters.workspaceId}`);
      return validatedDbs.filter(db => db.workspaceId === filters.workspaceId);
    }
    
    console.log(`Retrieved ${validatedDbs.length} databases`);
    return validatedDbs;
  } catch (error) {
    console.error('Error listing databases:', error);
    return [];
  }
}

/**
 * Force synchronization of databases with backend
 * 
 * @returns {Promise<Object>} - Sync result
 */
export async function syncDatabases() {
  return await syncWithBackend();
}

/**
 * Repair and validate all database data
 * 
 * This performs a full scan of stored databases, fixing any corruption or missing data
 * and ensuring all databases have proper workspace association.
 * 
 * @returns {Promise<Object>} - Results of the repair operation
 */
export async function repairDatabaseData() {
  try {
    console.log('Starting database data repair process...');
    const startTime = Date.now();
    
    // Get all databases without filtering
    const allDatabases = await listData(STORE_TYPE, { bypassCache: true });
    
    if (!allDatabases || !Array.isArray(allDatabases)) {
      throw new Error('Failed to retrieve databases');
    }
    
    console.log(`Found ${allDatabases.length} databases to check`);
    
    // Track repair statistics
    const stats = {
      total: allDatabases.length,
      repaired: 0,
      failed: 0,
      workspaceFixed: 0,
      tablesFixed: 0,
      timestampFixed: 0,
      nameFixed: 0,
      errors: []
    };
    
    // Process each database
    for (const db of allDatabases) {
      try {
        let needsRepair = false;
        let repairs = [];
        
        // Create a clean copy for repairs
        const repairedDb = { ...db };
        
        // Fix missing name
        if (!repairedDb.name) {
          repairedDb.name = 'Untitled Database';
          needsRepair = true;
          repairs.push('fixed missing name');
          stats.nameFixed++;
        }
        
        // Fix missing workspace
        if (!repairedDb.workspaceId && appState.currentWorkspace) {
          repairedDb.workspaceId = appState.currentWorkspace.id;
          needsRepair = true;
          repairs.push('added workspace association');
          stats.workspaceFixed++;
        }
        
        // Fix timestamp inconsistencies
        if (!repairedDb.updated || !repairedDb.updatedAt) {
          const timestamp = new Date().toISOString();
          repairedDb.updated = timestamp;
          repairedDb.updatedAt = timestamp;
          needsRepair = true;
          repairs.push('fixed timestamps');
          stats.timestampFixed++;
        }
        
        // Fix tables issues
        if (!repairedDb.tables || !Array.isArray(repairedDb.tables)) {
          repairedDb.tables = [];
          needsRepair = true;
          repairs.push('fixed invalid tables');
          stats.tablesFixed++;
        } else {
          // Fix individual tables
          let tablesNeedRepair = false;
          repairedDb.tables = repairedDb.tables.map(table => {
            if (!table || typeof table !== 'object') {
              tablesNeedRepair = true;
              return {
                id: 'table_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: 'Untitled Table',
                columns: [],
                rows: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                workspaceId: repairedDb.workspaceId
              };
            }
            
            const fixedTable = { ...table };
            let tableNeedsRepair = false;
            
            // Ensure table has required fields
            if (!fixedTable.id) {
              fixedTable.id = 'table_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              tableNeedsRepair = true;
            }
            
            if (!fixedTable.name) {
              fixedTable.name = 'Untitled Table';
              tableNeedsRepair = true;
            }
            
            if (!Array.isArray(fixedTable.columns)) {
              fixedTable.columns = [];
              tableNeedsRepair = true;
            }
            
            if (!Array.isArray(fixedTable.rows)) {
              fixedTable.rows = [];
              tableNeedsRepair = true;
            }
            
            // Ensure table has timestamps
            if (!fixedTable.createdAt) {
              fixedTable.createdAt = new Date().toISOString();
              tableNeedsRepair = true;
            }
            
            fixedTable.updatedAt = new Date().toISOString();
            
            // Ensure table has workspace ID
            if (!fixedTable.workspaceId) {
              fixedTable.workspaceId = repairedDb.workspaceId;
              tableNeedsRepair = true;
            }
            
            if (tableNeedsRepair) {
              tablesNeedRepair = true;
            }
            
            return fixedTable;
          });
          
          if (tablesNeedRepair) {
            needsRepair = true;
            repairs.push('fixed tables');
            stats.tablesFixed++;
          }
        }
        
        // If database needed repairs, save the fixed version
        if (needsRepair) {
          await saveData(STORE_TYPE, repairedDb, { silent: true });
          stats.repaired++;
          console.log(`Repaired database ${repairedDb.id}: ${repairs.join(', ')}`);
        }
      } catch (dbError) {
        console.error(`Error repairing database ${db.id}:`, dbError);
        stats.failed++;
        stats.errors.push({
          id: db.id,
          error: dbError.message
        });
      }
    }
    
    // Calculate timing
    const duration = Date.now() - startTime;
    stats.durationMs = duration;
    stats.durationSec = (duration / 1000).toFixed(2);
    
    console.log('Database repair complete:', stats);
    return stats;
  } catch (error) {
    console.error('Database repair process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 