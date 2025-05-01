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
    
    // Data Storage API
    saveDocument: (docData) => ipcRenderer.invoke('save-document', docData),
    loadDocument: (docId) => ipcRenderer.invoke('load-document', docId),
    listDocuments: () => ipcRenderer.invoke('list-documents'),
    deleteDocument: (docId) => ipcRenderer.invoke('delete-document', docId),
    
    // Block-related APIs
    createBlock: (blockData) => ipcRenderer.invoke('create-block', blockData),
    updateBlock: (blockId, blockData) => ipcRenderer.invoke('update-block', blockId, blockData),
    deleteBlock: (blockId) => ipcRenderer.invoke('delete-block', blockId),
    
    // Database operations
    createDatabase: (dbConfig) => ipcRenderer.invoke('create-database', dbConfig),
    updateDatabase: (dbId, dbConfig) => ipcRenderer.invoke('update-database', dbId, dbConfig),
    queryDatabase: (dbId, query) => ipcRenderer.invoke('query-database', dbId, query),
    listDatabases: () => ipcRenderer.invoke('list-databases'),
    
    // Receive notifications from main process
    onDocumentChanged: (callback) => ipcRenderer.on('document-changed', (_, ...args) => callback(...args)),
    onSyncComplete: (callback) => ipcRenderer.on('sync-complete', (_, ...args) => callback(...args))
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