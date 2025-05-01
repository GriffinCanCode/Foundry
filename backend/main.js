const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data storage directory
const dataDir = path.join(app.getPath('userData'), 'FoundryData');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database directory
const dbDir = path.join(dataDir, 'databases');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Documents directory
const docsDir = path.join(dataDir, 'documents');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Settings directory and file
const settingsDir = path.join(dataDir, 'settings');
if (!fs.existsSync(settingsDir)) {
  fs.mkdirSync(settingsDir, { recursive: true });
}

// Default settings
const defaultSettings = {
  darkMode: false,
  autoSave: true,
  autoSaveInterval: 30,
  lastUpdated: new Date().toISOString()
};

// Settings file path
const settingsFilePath = path.join(settingsDir, 'app-settings.json');

// Create default settings file if it doesn't exist
if (!fs.existsSync(settingsFilePath)) {
  fs.writeFileSync(
    settingsFilePath,
    JSON.stringify(defaultSettings, null, 2)
  );
}

// Workspaces directory
const workspacesDir = path.join(dataDir, 'workspaces');
if (!fs.existsSync(workspacesDir)) {
  fs.mkdirSync(workspacesDir, { recursive: true });
  
  // Create a default workspace if none exist
  const defaultWorkspace = {
    id: 'default',
    name: 'Default Workspace',
    description: 'Default workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(workspacesDir, 'default.json'),
    JSON.stringify(defaultWorkspace, null, 2)
  );
}

// Track the active workspace
let activeWorkspace = null;

// Create the browser window function
const createWindow = () => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false, // Security: keep Node.js integration disabled
      contextIsolation: true, // Security: enable context isolation
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
};

// Setup IPC handlers for data operations
function setupIpcHandlers() {
  // Workspace operations
  ipcMain.handle('list-workspaces', async () => {
    try {
      const files = await fs.promises.readdir(workspacesDir);
      const workspaces = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = await fs.promises.readFile(path.join(workspacesDir, file), 'utf8');
            const workspace = JSON.parse(data);
            workspaces.push({
              id: workspace.id,
              name: workspace.name,
              description: workspace.description,
              updatedAt: workspace.updatedAt,
              createdAt: workspace.createdAt
            });
          } catch (err) {
            console.error(`Error reading workspace ${file}:`, err);
          }
        }
      }
      
      return { success: true, workspaces };
    } catch (error) {
      console.error('Error listing workspaces:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-workspace', async (event, workspaceData) => {
    try {
      const workspaceId = workspaceData.id || Date.now().toString();
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);
      
      // Include timestamp and id if not present
      const workspaceToSave = {
        ...workspaceData,
        id: workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: workspaceData.createdAt || new Date().toISOString()
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(workspaceToSave, null, 2));
      
      // Create workspace-specific directories
      const wsDocsDir = path.join(workspacesDir, workspaceId, 'documents');
      const wsDbDir = path.join(workspacesDir, workspaceId, 'databases');
      
      await fs.promises.mkdir(wsDocsDir, { recursive: true });
      await fs.promises.mkdir(wsDbDir, { recursive: true });
      
      return { success: true, id: workspaceId, workspace: workspaceToSave };
    } catch (error) {
      console.error('Error creating workspace:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-workspace', async (event, workspaceId) => {
    try {
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);
      const data = await fs.promises.readFile(filePath, 'utf8');
      return { success: true, workspace: JSON.parse(data) };
    } catch (error) {
      console.error('Error getting workspace:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('select-workspace', async (event, workspaceId) => {
    try {
      // Validate the workspace exists
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);
      const data = await fs.promises.readFile(filePath, 'utf8');
      activeWorkspace = JSON.parse(data);
      
      return { 
        success: true, 
        workspace: activeWorkspace 
      };
    } catch (error) {
      console.error('Error selecting workspace:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-active-workspace', async () => {
    if (!activeWorkspace) {
      try {
        // Try to load the default workspace
        const filePath = path.join(workspacesDir, 'default.json');
        if (fs.existsSync(filePath)) {
          const data = await fs.promises.readFile(filePath, 'utf8');
          activeWorkspace = JSON.parse(data);
        }
      } catch (error) {
        console.error('Error loading default workspace:', error);
      }
    }
    
    return { 
      success: !!activeWorkspace, 
      workspace: activeWorkspace || null 
    };
  });

  // Document operations
  ipcMain.handle('save-document', async (event, docData) => {
    try {
      const docId = docData.id || Date.now().toString();
      
      // Use workspace-specific directory if available
      let targetDir = docsDir;
      if (activeWorkspace) {
        const wsDocsDir = path.join(workspacesDir, activeWorkspace.id, 'documents');
        if (fs.existsSync(wsDocsDir)) {
          targetDir = wsDocsDir;
        }
      }
      
      const filePath = path.join(targetDir, `${docId}.json`);
      
      // Include timestamp and id if not present
      const documentToSave = {
        ...docData,
        id: docId,
        workspaceId: activeWorkspace?.id || 'default',
        updatedAt: new Date().toISOString(),
        createdAt: docData.createdAt || new Date().toISOString()
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(documentToSave, null, 2));
      return { success: true, id: docId };
    } catch (error) {
      console.error('Error saving document:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('load-document', async (event, docId) => {
    try {
      // First try to load from active workspace
      let filePath = null;
      let data = null;
      
      if (activeWorkspace) {
        const wsDocsDir = path.join(workspacesDir, activeWorkspace.id, 'documents');
        filePath = path.join(wsDocsDir, `${docId}.json`);
        
        if (fs.existsSync(filePath)) {
          data = await fs.promises.readFile(filePath, 'utf8');
        }
      }
      
      // If not found, try the global docs directory
      if (!data) {
        filePath = path.join(docsDir, `${docId}.json`);
        data = await fs.promises.readFile(filePath, 'utf8');
      }
      
      return { success: true, document: JSON.parse(data) };
    } catch (error) {
      console.error('Error loading document:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-documents', async () => {
    try {
      const documents = [];
      
      // List documents from workspace-specific directory if available
      if (activeWorkspace) {
        const wsDocsDir = path.join(workspacesDir, activeWorkspace.id, 'documents');
        
        if (fs.existsSync(wsDocsDir)) {
          const files = await fs.promises.readdir(wsDocsDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const data = await fs.promises.readFile(path.join(wsDocsDir, file), 'utf8');
                const doc = JSON.parse(data);
                documents.push({
                  id: doc.id,
                  title: doc.title,
                  updatedAt: doc.updatedAt,
                  createdAt: doc.createdAt
                });
              } catch (err) {
                console.error(`Error reading document ${file}:`, err);
              }
            }
          }
        }
      }
      
      // If no workspace is active or no documents found, try the global docs directory
      if (documents.length === 0) {
        const files = await fs.promises.readdir(docsDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const data = await fs.promises.readFile(path.join(docsDir, file), 'utf8');
              const doc = JSON.parse(data);
              documents.push({
                id: doc.id,
                title: doc.title,
                updatedAt: doc.updatedAt,
                createdAt: doc.createdAt
              });
            } catch (err) {
              console.error(`Error reading document ${file}:`, err);
            }
          }
        }
      }
      
      return { success: true, documents };
    } catch (error) {
      console.error('Error listing documents:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-document', async (event, docId) => {
    try {
      let deleted = false;
      
      // Try to delete from workspace-specific directory if available
      if (activeWorkspace) {
        const wsDocsDir = path.join(workspacesDir, activeWorkspace.id, 'documents');
        const wsFilePath = path.join(wsDocsDir, `${docId}.json`);
        
        if (fs.existsSync(wsFilePath)) {
          await fs.promises.unlink(wsFilePath);
          deleted = true;
        }
      }
      
      // If not found, try the global docs directory
      if (!deleted) {
        const filePath = path.join(docsDir, `${docId}.json`);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          deleted = true;
        }
      }
      
      if (deleted) {
        return { success: true };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }
  });

  // Additional handlers for block and database operations
  // These would be more complex and would interact with a database system
  // For simplicity, we're just stubbing them here
  ipcMain.handle('create-block', async (event, blockData) => {
    // In a real app, this might be part of a document update
    return { success: true, id: Date.now().toString() };
  });

  ipcMain.handle('update-block', async (event, blockId, blockData) => {
    return { success: true };
  });

  ipcMain.handle('delete-block', async (event, blockId) => {
    return { success: true };
  });

  // Database operations (simplified)
  ipcMain.handle('create-database', async (event, dbConfig) => {
    try {
      const dbId = dbConfig.id || Date.now().toString();
      
      // Use workspace-specific directory if available
      let targetDir = dbDir;
      if (activeWorkspace) {
        const wsDbDir = path.join(workspacesDir, activeWorkspace.id, 'databases');
        if (fs.existsSync(wsDbDir)) {
          targetDir = wsDbDir;
        }
      }
      
      const filePath = path.join(targetDir, `${dbId}.json`);
      
      const dbToSave = {
        ...dbConfig,
        id: dbId,
        workspaceId: activeWorkspace?.id || 'default',
        updatedAt: new Date().toISOString(),
        createdAt: dbConfig.createdAt || new Date().toISOString(),
        entries: dbConfig.entries || []
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(dbToSave, null, 2));
      return { success: true, id: dbId, database: dbToSave };
    } catch (error) {
      console.error('Error creating database:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-database', async (event, dbId, dbConfig) => {
    try {
      // Try to update in workspace-specific directory if available
      let filePath = null;
      let existingDb = null;
      
      if (activeWorkspace) {
        const wsDbDir = path.join(workspacesDir, activeWorkspace.id, 'databases');
        filePath = path.join(wsDbDir, `${dbId}.json`);
        
        if (fs.existsSync(filePath)) {
          const data = await fs.promises.readFile(filePath, 'utf8');
          existingDb = JSON.parse(data);
        }
      }
      
      // If not found, try the global db directory
      if (!existingDb) {
        filePath = path.join(dbDir, `${dbId}.json`);
        const data = await fs.promises.readFile(filePath, 'utf8');
        existingDb = JSON.parse(data);
      }
      
      // Update with new config
      const updatedDb = {
        ...existingDb,
        ...dbConfig,
        id: dbId,
        updatedAt: new Date().toISOString()
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(updatedDb, null, 2));
      return { success: true, database: updatedDb };
    } catch (error) {
      console.error('Error updating database:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-databases', async () => {
    try {
      const databases = [];
      
      // List databases from workspace-specific directory if available
      if (activeWorkspace) {
        const wsDbDir = path.join(workspacesDir, activeWorkspace.id, 'databases');
        
        if (fs.existsSync(wsDbDir)) {
          const files = await fs.promises.readdir(wsDbDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const data = await fs.promises.readFile(path.join(wsDbDir, file), 'utf8');
                const db = JSON.parse(data);
                databases.push({
                  id: db.id,
                  name: db.name,
                  updatedAt: db.updatedAt,
                  createdAt: db.createdAt
                });
              } catch (err) {
                console.error(`Error reading database ${file}:`, err);
              }
            }
          }
        }
      }
      
      // If no workspace is active or no databases found, try the global db directory
      if (databases.length === 0) {
        const files = await fs.promises.readdir(dbDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const data = await fs.promises.readFile(path.join(dbDir, file), 'utf8');
              const db = JSON.parse(data);
              databases.push({
                id: db.id,
                name: db.name,
                updatedAt: db.updatedAt,
                createdAt: db.createdAt
              });
            } catch (err) {
              console.error(`Error reading database ${file}:`, err);
            }
          }
        }
      }
      
      return { success: true, databases };
    } catch (error) {
      console.error('Error listing databases:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('query-database', async (event, dbId, query) => {
    try {
      // Try to query in workspace-specific directory if available
      let filePath = null;
      let db = null;
      
      if (activeWorkspace) {
        const wsDbDir = path.join(workspacesDir, activeWorkspace.id, 'databases');
        filePath = path.join(wsDbDir, `${dbId}.json`);
        
        if (fs.existsSync(filePath)) {
          const data = await fs.promises.readFile(filePath, 'utf8');
          db = JSON.parse(data);
        }
      }
      
      // If not found, try the global db directory
      if (!db) {
        filePath = path.join(dbDir, `${dbId}.json`);
        const data = await fs.promises.readFile(filePath, 'utf8');
        db = JSON.parse(data);
      }
      
      // Very simple query implementation
      // In a real app, this would be much more sophisticated
      let results = [...db.entries];
      
      // Apply filters if present
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          results = results.filter(entry => entry[key] === value);
        }
      }
      
      // Apply sort if present
      if (query.sort) {
        const { field, direction } = query.sort;
        results.sort((a, b) => {
          if (direction === 'asc') {
            return a[field] > b[field] ? 1 : -1;
          } else {
            return a[field] < b[field] ? 1 : -1;
          }
        });
      }
      
      return { 
        success: true,
        results,
        total: results.length
      };
    } catch (error) {
      console.error('Error querying database:', error);
      return { success: false, error: error.message };
    }
  });

  // Settings handlers
  ipcMain.handle('load-settings', async () => {
    try {
      const data = await fs.promises.readFile(settingsFilePath, 'utf8');
      return { success: true, settings: JSON.parse(data) };
    } catch (error) {
      console.error('Error loading settings:', error);
      return { success: false, error: error.message, settings: defaultSettings };
    }
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      const updatedSettings = {
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        settingsFilePath, 
        JSON.stringify(updatedSettings, null, 2)
      );
      
      return { success: true, settings: updatedSettings };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 