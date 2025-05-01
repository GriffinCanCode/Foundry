const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Data storage directory
const dataDir = path.join(app.getPath("userData"), "FoundryData");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database directory
const dbDir = path.join(dataDir, "databases");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Documents directory
const docsDir = path.join(dataDir, "documents");
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Settings directory and file
const settingsDir = path.join(dataDir, "settings");
if (!fs.existsSync(settingsDir)) {
  fs.mkdirSync(settingsDir, { recursive: true });
}

// Default settings
const defaultSettings = {
  darkMode: false,
  autoSave: true,
  autoSaveInterval: 30,
  lastUpdated: new Date().toISOString(),
};

// Settings file path
const settingsFilePath = path.join(settingsDir, "app-settings.json");

// Create default settings file if it doesn't exist
if (!fs.existsSync(settingsFilePath)) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
}

// Workspaces directory
const workspacesDir = path.join(dataDir, "workspaces");
if (!fs.existsSync(workspacesDir)) {
  fs.mkdirSync(workspacesDir, { recursive: true });

  // Create a default workspace if none exist
  const defaultWorkspace = {
    id: "default",
    name: "Default Workspace",
    description: "Default workspace",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(workspacesDir, "default.json"),
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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, "../frontend/index.html"));

  // Open DevTools in development
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }
};

// Setup IPC handlers for data operations
function setupIpcHandlers() {
  // Workspace operations
  ipcMain.handle("list-workspaces", async () => {
    try {
      const files = await fs.promises.readdir(workspacesDir);
      const workspaces = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const data = await fs.promises.readFile(
              path.join(workspacesDir, file),
              "utf8"
            );
            const workspace = JSON.parse(data);
            workspaces.push({
              id: workspace.id,
              name: workspace.name,
              description: workspace.description,
              updatedAt: workspace.updatedAt,
              createdAt: workspace.createdAt,
            });
          } catch (err) {
            console.error(`Error reading workspace ${file}:`, err);
          }
        }
      }

      return { success: true, workspaces };
    } catch (error) {
      console.error("Error listing workspaces:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("create-workspace", async (event, workspaceData) => {
    try {
      const workspaceId = workspaceData.id || Date.now().toString();
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);

      // Include timestamp and id if not present
      const workspaceToSave = {
        ...workspaceData,
        id: workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: workspaceData.createdAt || new Date().toISOString(),
      };

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(workspaceToSave, null, 2)
      );

      // Create workspace-specific directories
      const wsDocsDir = path.join(workspacesDir, workspaceId, "documents");
      const wsDbDir = path.join(workspacesDir, workspaceId, "databases");

      await fs.promises.mkdir(wsDocsDir, { recursive: true });
      await fs.promises.mkdir(wsDbDir, { recursive: true });

      return { success: true, id: workspaceId, workspace: workspaceToSave };
    } catch (error) {
      console.error("Error creating workspace:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-workspace", async (event, workspaceId) => {
    try {
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);
      const data = await fs.promises.readFile(filePath, "utf8");
      return { success: true, workspace: JSON.parse(data) };
    } catch (error) {
      console.error("Error getting workspace:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("select-workspace", async (event, workspaceId) => {
    try {
      // Validate the workspace exists
      const filePath = path.join(workspacesDir, `${workspaceId}.json`);
      const data = await fs.promises.readFile(filePath, "utf8");
      activeWorkspace = JSON.parse(data);

      return {
        success: true,
        workspace: activeWorkspace,
      };
    } catch (error) {
      console.error("Error selecting workspace:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-active-workspace", async () => {
    if (!activeWorkspace) {
      try {
        // Try to load the default workspace
        const filePath = path.join(workspacesDir, "default.json");
        if (fs.existsSync(filePath)) {
          const data = await fs.promises.readFile(filePath, "utf8");
          activeWorkspace = JSON.parse(data);
        }
      } catch (error) {
        console.error("Error loading default workspace:", error);
      }
    }

    return {
      success: !!activeWorkspace,
      workspace: activeWorkspace || null,
    };
  });

  // Document operations
  ipcMain.handle("save-document", async (event, docData) => {
    try {
      const docId = docData.id || Date.now().toString();

      // Ensure required metadata is present
      const workspaceId =
        docData.workspaceId ||
        (activeWorkspace ? activeWorkspace.id : "default");

      // Use workspace-specific directory if available
      let targetDir = docsDir;
      if (workspaceId !== "default") {
        const wsDocsDir = path.join(workspacesDir, workspaceId, "documents");
        if (fs.existsSync(wsDocsDir)) {
          targetDir = wsDocsDir;
        } else {
          // Create the workspace documents directory if it doesn't exist
          await fs.promises.mkdir(wsDocsDir, { recursive: true });
          targetDir = wsDocsDir;
        }
      }

      const filePath = path.join(targetDir, `${docId}.json`);

      // Include timestamp and metadata if not present
      const documentToSave = {
        ...docData,
        id: docId,
        workspaceId: workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: docData.createdAt || new Date().toISOString(),
      };

      // Ensure content blocks have proper metadata
      if (Array.isArray(documentToSave.content)) {
        documentToSave.content = documentToSave.content.map((block, index) => {
          return {
            ...block,
            id: block.id || `block_${Date.now()}_${index}`,
            workspaceId: workspaceId,
            updatedAt: new Date().toISOString(),
            createdAt: block.createdAt || new Date().toISOString(),
            position: block.position !== undefined ? block.position : index,
          };
        });
      }

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(documentToSave, null, 2)
      );
      return { success: true, id: docId };
    } catch (error) {
      console.error("Error saving document:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("load-document", async (event, docId) => {
    try {
      // First try to load from active workspace
      let filePath = null;
      let data = null;

      if (activeWorkspace) {
        const wsDocsDir = path.join(
          workspacesDir,
          activeWorkspace.id,
          "documents"
        );
        filePath = path.join(wsDocsDir, `${docId}.json`);

        if (fs.existsSync(filePath)) {
          data = await fs.promises.readFile(filePath, "utf8");
        }
      }

      // If not found, try the global docs directory
      if (!data) {
        filePath = path.join(docsDir, `${docId}.json`);
        data = await fs.promises.readFile(filePath, "utf8");
      }

      return { success: true, document: JSON.parse(data) };
    } catch (error) {
      console.error("Error loading document:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("list-documents", async () => {
    try {
      const documents = [];

      // List documents from workspace-specific directory if available
      if (activeWorkspace) {
        const wsDocsDir = path.join(
          workspacesDir,
          activeWorkspace.id,
          "documents"
        );

        if (fs.existsSync(wsDocsDir)) {
          const files = await fs.promises.readdir(wsDocsDir);

          for (const file of files) {
            if (file.endsWith(".json")) {
              try {
                const data = await fs.promises.readFile(
                  path.join(wsDocsDir, file),
                  "utf8"
                );
                const doc = JSON.parse(data);
                documents.push({
                  id: doc.id,
                  title: doc.title,
                  updatedAt: doc.updatedAt,
                  createdAt: doc.createdAt,
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
          if (file.endsWith(".json")) {
            try {
              const data = await fs.promises.readFile(
                path.join(docsDir, file),
                "utf8"
              );
              const doc = JSON.parse(data);
              documents.push({
                id: doc.id,
                title: doc.title,
                updatedAt: doc.updatedAt,
                createdAt: doc.createdAt,
              });
            } catch (err) {
              console.error(`Error reading document ${file}:`, err);
            }
          }
        }
      }

      return { success: true, documents };
    } catch (error) {
      console.error("Error listing documents:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-document", async (event, docId) => {
    try {
      let deleted = false;

      // Try to delete from workspace-specific directory if available
      if (activeWorkspace) {
        const wsDocsDir = path.join(
          workspacesDir,
          activeWorkspace.id,
          "documents"
        );
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
        return { success: false, error: "Document not found" };
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      return { success: false, error: error.message };
    }
  });

  // Additional handlers for block and database operations
  // These would be more complex and would interact with a database system
  // For simplicity, we're just stubbing them here
  ipcMain.handle("create-block", async (event, blockData) => {
    // In a real app, this might be part of a document update
    return { success: true, id: Date.now().toString() };
  });

  ipcMain.handle("update-block", async (event, blockId, blockData) => {
    return { success: true };
  });

  ipcMain.handle("delete-block", async (event, blockId) => {
    return { success: true };
  });

  // Database operations
  ipcMain.handle('save-database', async (event, dbData) => {
    try {
      const dbId = dbData.id || Date.now().toString();
      
      // Ensure required metadata is present
      const workspaceId = dbData.workspaceId || (activeWorkspace ? activeWorkspace.id : 'default');
      
      // Use workspace-specific directory if available
      let targetDir = dbDir;
      if (workspaceId !== 'default') {
        const wsDbDir = path.join(workspacesDir, workspaceId, 'databases');
        if (fs.existsSync(wsDbDir)) {
          targetDir = wsDbDir;
        } else {
          // Create the workspace databases directory if it doesn't exist
          await fs.promises.mkdir(wsDbDir, { recursive: true });
          targetDir = wsDbDir;
        }
      }
      
      // Make sure the database directory exists
      if (!fs.existsSync(targetDir)) {
        await fs.promises.mkdir(targetDir, { recursive: true });
      }
      
      // Set the properties
      const database = {
        ...dbData,
        id: dbId,
        workspaceId: workspaceId,
        updated: new Date().toISOString()
      };
      
      // Make sure created date exists
      if (!database.created) {
        database.created = database.updated;
      }
      
      // Validate the database tables
      if (!Array.isArray(database.tables)) {
        database.tables = [];
      }
      
      // Apply workspace ID to tables
      database.tables = database.tables.map(table => ({
        ...table,
        workspaceId: workspaceId,
        updatedAt: new Date().toISOString()
      }));
      
      // Save the database file
      const dbFilePath = path.join(targetDir, `${dbId}.json`);
      await fs.promises.writeFile(dbFilePath, JSON.stringify(database, null, 2));
      
      return { success: true, id: dbId };
    } catch (error) {
      console.error('Error saving database:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('load-database', async (event, id) => {
    try {
      // Try to find the database in workspace folders first
      let dbFile = null;
      let dbData = null;
      
      // Check in current workspace first if there is one
      if (activeWorkspace) {
        const wsDbFile = path.join(workspacesDir, activeWorkspace.id, 'databases', `${id}.json`);
        if (fs.existsSync(wsDbFile)) {
          dbFile = wsDbFile;
        }
      }
      
      // If not found, check in the default location
      if (!dbFile) {
        const defaultDbFile = path.join(dbDir, `${id}.json`);
        if (fs.existsSync(defaultDbFile)) {
          dbFile = defaultDbFile;
        }
      }
      
      // If still not found, look in all workspace folders
      if (!dbFile) {
        const workspaces = fs.readdirSync(workspacesDir);
        for (const ws of workspaces) {
          const wsDbFile = path.join(workspacesDir, ws, 'databases', `${id}.json`);
          if (fs.existsSync(wsDbFile)) {
            dbFile = wsDbFile;
            break;
          }
        }
      }
      
      if (!dbFile) {
        return { success: false, error: 'Database not found' };
      }
      
      // Read and parse the database file
      const dbContent = await fs.promises.readFile(dbFile, 'utf8');
      dbData = JSON.parse(dbContent);
      
      // Ensure the database has a workspace ID
      if (!dbData.workspaceId && activeWorkspace) {
        dbData.workspaceId = activeWorkspace.id;
      }
      
      return { success: true, data: dbData };
    } catch (error) {
      console.error('Error loading database:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('delete-database', async (event, id) => {
    try {
      // Try to find the database file in workspaces first
      let dbFile = null;
      
      // Check in current workspace first if there is one
      if (activeWorkspace) {
        const wsDbFile = path.join(workspacesDir, activeWorkspace.id, 'databases', `${id}.json`);
        if (fs.existsSync(wsDbFile)) {
          dbFile = wsDbFile;
        }
      }
      
      // If not found, check in the default location
      if (!dbFile) {
        const defaultDbFile = path.join(dbDir, `${id}.json`);
        if (fs.existsSync(defaultDbFile)) {
          dbFile = defaultDbFile;
        }
      }
      
      // If still not found, look in all workspace folders
      if (!dbFile) {
        const workspaces = fs.readdirSync(workspacesDir);
        for (const ws of workspaces) {
          const wsDbFile = path.join(workspacesDir, ws, 'databases', `${id}.json`);
          if (fs.existsSync(wsDbFile)) {
            dbFile = wsDbFile;
            break;
          }
        }
      }
      
      if (!dbFile) {
        return { success: false, error: 'Database not found' };
      }
      
      // Delete the database file
      await fs.promises.unlink(dbFile);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting database:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('list-databases', async (event, workspaceId) => {
    try {
      const databases = [];
      
      // Get all databases from the specified workspace or all workspaces
      if (workspaceId) {
        const wsDbDir = path.join(workspacesDir, workspaceId, 'databases');
        if (fs.existsSync(wsDbDir)) {
          const files = fs.readdirSync(wsDbDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const content = await fs.promises.readFile(path.join(wsDbDir, file), 'utf8');
                const data = JSON.parse(content);
                databases.push(data);
              } catch (readError) {
                console.error(`Error reading database file ${file}:`, readError);
              }
            }
          }
        }
      } else {
        // Get databases from all workspaces and the default location
        const workspaces = fs.existsSync(workspacesDir) ? fs.readdirSync(workspacesDir) : [];
        
        // Check default database directory
        if (fs.existsSync(dbDir)) {
          const files = fs.readdirSync(dbDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const content = await fs.promises.readFile(path.join(dbDir, file), 'utf8');
                const data = JSON.parse(content);
                databases.push(data);
              } catch (readError) {
                console.error(`Error reading database file ${file}:`, readError);
              }
            }
          }
        }
        
        // Check each workspace
        for (const ws of workspaces) {
          const wsDbDir = path.join(workspacesDir, ws, 'databases');
          if (fs.existsSync(wsDbDir)) {
            const files = fs.readdirSync(wsDbDir);
            for (const file of files) {
              if (file.endsWith('.json')) {
                try {
                  const content = await fs.promises.readFile(path.join(wsDbDir, file), 'utf8');
                  const data = JSON.parse(content);
                  databases.push(data);
                } catch (readError) {
                  console.error(`Error reading database file ${file}:`, readError);
                }
              }
            }
          }
        }
      }
      
      return { success: true, data: databases };
    } catch (error) {
      console.error('Error listing databases:', error);
      return { success: false, error: error.message };
    }
  });

  // Settings handlers
  ipcMain.handle("load-settings", async () => {
    try {
      const data = await fs.promises.readFile(settingsFilePath, "utf8");
      return { success: true, settings: JSON.parse(data) };
    } catch (error) {
      console.error("Error loading settings:", error);
      return {
        success: false,
        error: error.message,
        settings: defaultSettings,
      };
    }
  });

  ipcMain.handle("save-settings", async (event, settings) => {
    try {
      const updatedSettings = {
        ...settings,
        lastUpdated: new Date().toISOString(),
      };

      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(updatedSettings, null, 2)
      );

      return { success: true, settings: updatedSettings };
    } catch (error) {
      console.error("Error saving settings:", error);
      return { success: false, error: error.message };
    }
  });

  // Document search
  ipcMain.handle("search-documents", async (event, query) => {
    try {
      // Get workspace-specific directory if available
      let targetDir = docsDir;
      if (activeWorkspace) {
        const wsDocsDir = path.join(
          workspacesDir,
          activeWorkspace.id,
          "documents"
        );
        if (fs.existsSync(wsDocsDir)) {
          targetDir = wsDocsDir;
        }
      }

      // Read all document files in the target directory
      const files = await fs.promises.readdir(targetDir);
      const matchingDocs = [];

      // Convert query to lowercase for case-insensitive search
      const lowerQuery = query.toLowerCase();

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const data = await fs.promises.readFile(
              path.join(targetDir, file),
              "utf8"
            );
            const doc = JSON.parse(data);

            // Search in title
            if (doc.title && doc.title.toLowerCase().includes(lowerQuery)) {
              matchingDocs.push(doc);
              continue;
            }

            // Search in content
            if (doc.content && Array.isArray(doc.content)) {
              const contentMatch = doc.content.some((block) => {
                return (
                  block.content &&
                  typeof block.content === "string" &&
                  block.content.toLowerCase().includes(lowerQuery)
                );
              });

              if (contentMatch) {
                matchingDocs.push(doc);
              }
            }
          } catch (err) {
            console.error(`Error searching document ${file}:`, err);
          }
        }
      }

      return { success: true, documents: matchingDocs };
    } catch (error) {
      console.error("Error searching documents:", error);
      return { success: false, error: error.message };
    }
  });

  // Delete a workspace
  ipcMain.handle("delete-workspace", async (event, workspaceId) => {
    try {
      // Don't allow deleting the active workspace
      if (activeWorkspace && activeWorkspace.id === workspaceId) {
        return {
          success: false,
          error:
            "Cannot delete the active workspace. Switch to another workspace first.",
        };
      }

      const workspacePath = path.join(workspacesDir, `${workspaceId}.json`);
      const workspaceDirPath = path.join(workspacesDir, workspaceId);

      // Check if the workspace exists
      if (!fs.existsSync(workspacePath)) {
        return { success: false, error: "Workspace not found" };
      }

      // Delete workspace file
      await fs.promises.unlink(workspacePath);

      // Delete workspace directory if it exists
      if (fs.existsSync(workspaceDirPath)) {
        await fs.promises.rm(workspaceDirPath, {
          recursive: true,
          force: true,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting workspace:", error);
      return { success: false, error: error.message };
    }
  });

  // Get specific setting value
  ipcMain.handle("get-setting", async (event, key, defaultValue) => {
    try {
      // Read settings file
      const data = await fs.promises.readFile(settingsFilePath, "utf8");
      const settings = JSON.parse(data);

      return {
        success: true,
        value: settings[key] !== undefined ? settings[key] : defaultValue,
      };
    } catch (error) {
      console.error("Error getting setting:", error);
      return { success: false, error: error.message, value: defaultValue };
    }
  });

  // Set specific setting value
  ipcMain.handle("set-setting", async (event, key, value) => {
    try {
      // Read current settings
      const data = await fs.promises.readFile(settingsFilePath, "utf8");
      const settings = JSON.parse(data);

      // Update setting
      settings[key] = value;
      settings.lastUpdated = new Date().toISOString();

      // Save settings
      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(settings, null, 2)
      );

      return { success: true };
    } catch (error) {
      console.error("Error setting setting:", error);
      return { success: false, error: error.message };
    }
  });

  // Sync specific data
  ipcMain.handle("sync-data", async (event, dataType, dataIds) => {
    try {
      // This is a placeholder for actual sync implementation
      // In a real app, this would sync with a remote server

      // For now, just pretend we're syncing by updating the lastSynced property
      const now = new Date().toISOString();

      if (dataType === "documents" && Array.isArray(dataIds)) {
        // Get workspace-specific directory if available
        let targetDir = docsDir;
        if (activeWorkspace) {
          const wsDocsDir = path.join(
            workspacesDir,
            activeWorkspace.id,
            "documents"
          );
          if (fs.existsSync(wsDocsDir)) {
            targetDir = wsDocsDir;
          }
        }

        // Update each document
        for (const id of dataIds) {
          const filePath = path.join(targetDir, `${id}.json`);
          if (fs.existsSync(filePath)) {
            const data = await fs.promises.readFile(filePath, "utf8");
            const doc = JSON.parse(data);

            // Update lastSynced property
            doc.lastSynced = now;

            await fs.promises.writeFile(filePath, JSON.stringify(doc, null, 2));
          }
        }
      } else if (dataType === "workspaces" && Array.isArray(dataIds)) {
        // Update each workspace
        for (const id of dataIds) {
          const filePath = path.join(workspacesDir, `${id}.json`);
          if (fs.existsSync(filePath)) {
            const data = await fs.promises.readFile(filePath, "utf8");
            const workspace = JSON.parse(data);

            // Update lastSynced property
            workspace.lastSynced = now;

            await fs.promises.writeFile(
              filePath,
              JSON.stringify(workspace, null, 2)
            );
          }
        }
      }

      // Update last sync time in settings
      const settings = await fs.promises
        .readFile(settingsFilePath, "utf8")
        .then((data) => JSON.parse(data))
        .catch(() => defaultSettings);

      settings.lastSyncTime = now;

      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(settings, null, 2)
      );

      // Emit sync complete event
      event.sender.send("sync-complete", {
        dataType,
        count: dataIds.length,
        time: now,
      });

      return { success: true, time: now };
    } catch (error) {
      console.error("Error syncing data:", error);
      return { success: false, error: error.message };
    }
  });

  // Sync entire workspace
  ipcMain.handle("sync-workspace", async (event, workspaceId) => {
    try {
      // This is a placeholder for actual sync implementation
      // In a real app, this would sync with a remote server

      // Get the workspace
      const workspacePath = path.join(workspacesDir, `${workspaceId}.json`);
      if (!fs.existsSync(workspacePath)) {
        return { success: false, error: "Workspace not found" };
      }

      const now = new Date().toISOString();

      // Mark workspace as synced
      const workspaceData = await fs.promises.readFile(workspacePath, "utf8");
      const workspace = JSON.parse(workspaceData);
      workspace.lastSynced = now;

      await fs.promises.writeFile(
        workspacePath,
        JSON.stringify(workspace, null, 2)
      );

      // Mark all documents in the workspace as synced
      const wsDocsDir = path.join(workspacesDir, workspaceId, "documents");
      if (fs.existsSync(wsDocsDir)) {
        const files = await fs.promises.readdir(wsDocsDir);

        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = path.join(wsDocsDir, file);
            const docData = await fs.promises.readFile(filePath, "utf8");
            const doc = JSON.parse(docData);

            doc.lastSynced = now;

            await fs.promises.writeFile(filePath, JSON.stringify(doc, null, 2));
          }
        }
      }

      // Update last sync time in settings
      const settings = await fs.promises
        .readFile(settingsFilePath, "utf8")
        .then((data) => JSON.parse(data))
        .catch(() => defaultSettings);

      settings.lastSyncTime = now;

      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(settings, null, 2)
      );

      // Emit sync complete event
      event.sender.send("sync-complete", { workspaceId, time: now });

      return { success: true, time: now };
    } catch (error) {
      console.error("Error syncing workspace:", error);
      return { success: false, error: error.message };
    }
  });

  // Sync all data
  ipcMain.handle("sync-all", async (event) => {
    try {
      // This is a placeholder for actual sync implementation
      // In a real app, this would sync with a remote server

      const now = new Date().toISOString();

      // Sync all workspaces
      const workspaceFiles = await fs.promises.readdir(workspacesDir);

      for (const file of workspaceFiles) {
        if (file.endsWith(".json")) {
          const filePath = path.join(workspacesDir, file);
          const data = await fs.promises.readFile(filePath, "utf8");
          const workspace = JSON.parse(data);

          // Update lastSynced property
          workspace.lastSynced = now;

          await fs.promises.writeFile(
            filePath,
            JSON.stringify(workspace, null, 2)
          );

          // Sync all documents in this workspace
          const wsId = workspace.id;
          const wsDocsDir = path.join(workspacesDir, wsId, "documents");

          if (fs.existsSync(wsDocsDir)) {
            const docFiles = await fs.promises.readdir(wsDocsDir);

            for (const docFile of docFiles) {
              if (docFile.endsWith(".json")) {
                const docFilePath = path.join(wsDocsDir, docFile);
                const docData = await fs.promises.readFile(docFilePath, "utf8");
                const doc = JSON.parse(docData);

                // Update lastSynced property
                doc.lastSynced = now;

                await fs.promises.writeFile(
                  docFilePath,
                  JSON.stringify(doc, null, 2)
                );
              }
            }
          }
        }
      }

      // Sync all documents in the default directory
      const docFiles = await fs.promises.readdir(docsDir);

      for (const file of docFiles) {
        if (file.endsWith(".json")) {
          const filePath = path.join(docsDir, file);
          const data = await fs.promises.readFile(filePath, "utf8");
          const doc = JSON.parse(data);

          // Update lastSynced property
          doc.lastSynced = now;

          await fs.promises.writeFile(filePath, JSON.stringify(doc, null, 2));
        }
      }

      // Update last sync time in settings
      const settings = await fs.promises
        .readFile(settingsFilePath, "utf8")
        .then((data) => JSON.parse(data))
        .catch(() => defaultSettings);

      settings.lastSyncTime = now;

      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(settings, null, 2)
      );

      // Emit sync complete event
      event.sender.send("sync-complete", { full: true, time: now });

      return { success: true, time: now };
    } catch (error) {
      console.error("Error syncing all data:", error);
      return { success: false, error: error.message };
    }
  });

  // Get last sync time
  ipcMain.handle("get-last-sync-time", async (event) => {
    try {
      // Read settings file
      const data = await fs.promises.readFile(settingsFilePath, "utf8");
      const settings = JSON.parse(data);

      return {
        success: true,
        time: settings.lastSyncTime || null,
      };
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return { success: false, error: error.message, time: null };
    }
  });

  // Get system info
  ipcMain.handle("get-system-info", async (event) => {
    try {
      return {
        success: true,
        info: {
          platform: process.platform,
          arch: process.arch,
          version: process.getSystemVersion(),
          userDataPath: app.getPath("userData"),
          appPath: app.getAppPath(),
          storagePath: dataDir,
        },
      };
    } catch (error) {
      console.error("Error getting system info:", error);
      return { success: false, error: error.message };
    }
  });

  // Get app version
  ipcMain.handle("get-app-version", () => {
    return {
      success: true,
      version: app.getVersion(),
    };
  });

  // Check for updates
  ipcMain.handle("check-for-updates", async (event) => {
    try {
      // This is a placeholder for actual update check
      // In a real app, this would check with a remote server

      // For now, just return no updates available
      return {
        success: true,
        updateAvailable: false,
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion(),
      };
    } catch (error) {
      console.error("Error checking for updates:", error);
      return { success: false, error: error.message };
    }
  });

  // Offline mode management
  let offlineMode = false;

  ipcMain.handle("set-offline-mode", async (event, enabled) => {
    try {
      offlineMode = !!enabled;

      // Update settings
      const settings = await fs.promises
        .readFile(settingsFilePath, "utf8")
        .then((data) => JSON.parse(data))
        .catch(() => defaultSettings);

      settings.offlineMode = offlineMode;

      await fs.promises.writeFile(
        settingsFilePath,
        JSON.stringify(settings, null, 2)
      );

      // Notify renderer
      event.sender.send("network-status-changed", { offline: offlineMode });

      return { success: true, offline: offlineMode };
    } catch (error) {
      console.error("Error setting offline mode:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("is-offline-mode", () => {
    return { success: true, offline: offlineMode };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
