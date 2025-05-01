/**
 * app.js - Compatibility layer for legacy code
 * 
 * This file ensures backward compatibility with existing code that might
 * directly reference the old app.js. It imports and re-exports functionality
 * from our new modular structure.
 */

import { appState, initializeApp } from './core/app-core.js';
import { loadSettings, applyTheme } from './modules/settings.js';
import { initializeUI, toggleSidebar } from './modules/ui.js';
import { setupEventListeners } from './core/event-listeners.js';
import { 
    createNewDocument, 
    saveCurrentDocument, 
    loadDocument, 
    deleteDocument, 
    exportCurrentDocument 
} from './modules/document.js';
import { 
    checkActiveWorkspace, 
    showWorkspaceSelection, 
    createWorkspace, 
    selectWorkspace 
} from './modules/workspace.js';
import { 
    createNewDatabase, 
    viewDatabase 
} from './modules/database.js';
import { 
    showNotification 
} from './utils/notifications.js';
import { 
    closeModal 
} from './utils/modals.js';
import { 
    showShareDialog, 
    showSettingsDialog 
} from './modules/dialogs.js';
import { 
    initializePageEditor,
    showBlockMenu, 
    hideBlockMenu, 
    addBlock,
    addDatabaseBlock,
    transformBlock,
    getEditorContent
} from './modules/page-editor.js';
import { initializeOptimizerIntegration } from './utils/optimizer-integration.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app via compatibility layer...');
    initializeApp();
    setupEventListeners();
    
    // Initialize the page editor if present
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        initializePageEditor(editorElement);
        console.log('Page editor initialized');
    }
    
    // Initialize performance optimizations
    initializeOptimizerIntegration();
    console.log('Performance optimizations initialized');
});

// Re-export all the functions for backward compatibility
window.appState = appState;
window.loadSettings = loadSettings;
window.applyTheme = applyTheme;
window.initializeUI = initializeUI;
window.toggleSidebar = toggleSidebar;
window.createNewDocument = createNewDocument;
window.saveCurrentDocument = saveCurrentDocument;
window.loadDocument = loadDocument;
window.deleteDocument = deleteDocument;
window.exportCurrentDocument = exportCurrentDocument;
window.checkActiveWorkspace = checkActiveWorkspace;
window.showWorkspaceSelection = showWorkspaceSelection;
window.createWorkspace = createWorkspace;
window.selectWorkspace = selectWorkspace;
window.createNewDatabase = createNewDatabase;
window.viewDatabase = viewDatabase;
window.showNotification = showNotification;
window.closeModal = closeModal;
window.showShareDialog = showShareDialog;
window.showSettingsDialog = showSettingsDialog;
window.showBlockMenu = showBlockMenu;
window.hideBlockMenu = hideBlockMenu;
window.addBlock = addBlock;
window.addDatabaseBlock = addDatabaseBlock;
window.initializePageEditor = initializePageEditor;
window.transformBlock = transformBlock;
window.getEditorContent = getEditorContent;

console.warn('Using app.js compatibility layer - consider updating your imports to use the modular structure directly');