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
  // mainWindow.webContents.openDevTools();
};

// Setup IPC handlers for data operations
function setupIpcHandlers() {
  // Document operations
  ipcMain.handle('save-document', async (event, docData) => {
    try {
      const docId = docData.id || Date.now().toString();
      const filePath = path.join(docsDir, `${docId}.json`);
      
      // Include timestamp and id if not present
      const documentToSave = {
        ...docData,
        id: docId,
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
      const filePath = path.join(docsDir, `${docId}.json`);
      const data = await fs.promises.readFile(filePath, 'utf8');
      return { success: true, document: JSON.parse(data) };
    } catch (error) {
      console.error('Error loading document:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-documents', async () => {
    try {
      const files = await fs.promises.readdir(docsDir);
      const documents = [];
      
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
      
      return { success: true, documents };
    } catch (error) {
      console.error('Error listing documents:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-document', async (event, docId) => {
    try {
      const filePath = path.join(docsDir, `${docId}.json`);
      await fs.promises.unlink(filePath);
      return { success: true };
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
      const filePath = path.join(dbDir, `${dbId}.json`);
      
      const dbToSave = {
        ...dbConfig,
        id: dbId,
        updatedAt: new Date().toISOString(),
        createdAt: dbConfig.createdAt || new Date().toISOString(),
        entries: dbConfig.entries || []
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(dbToSave, null, 2));
      return { success: true, id: dbId };
    } catch (error) {
      console.error('Error creating database:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-database', async (event, dbId, dbConfig) => {
    try {
      const filePath = path.join(dbDir, `${dbId}.json`);
      
      // Read existing DB first
      const data = await fs.promises.readFile(filePath, 'utf8');
      const existingDb = JSON.parse(data);
      
      // Update with new config
      const updatedDb = {
        ...existingDb,
        ...dbConfig,
        id: dbId,
        updatedAt: new Date().toISOString()
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(updatedDb, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error updating database:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('query-database', async (event, dbId, query) => {
    try {
      const filePath = path.join(dbDir, `${dbId}.json`);
      const data = await fs.promises.readFile(filePath, 'utf8');
      const db = JSON.parse(data);
      
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