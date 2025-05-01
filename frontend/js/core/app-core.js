/**
 * app-core.js - Core application state and initialization
 */

import { loadSettings, applyTheme } from '../modules/settings.js';
import { initializeUI } from '../modules/ui.js';
import { checkActiveWorkspace } from '../modules/workspace.js';
import { loadDatabaseList } from '../modules/database.js';

// Global state for the application
export const appState = {
    currentWorkspace: null,
    workspaceList: [],
    currentDocument: null,
    documentList: [],
    databaseList: [],
    settings: {
        darkMode: false,
        autoSave: true,
        autoSaveInterval: 30
    },
    autoSaveTimer: null,
    appInitialized: false
};

// Initialize the application
export function initializeApp() {
    // Load settings
    loadSettings();
    
    // Initialize UI components
    initializeUI();
    
    // Check if we have an active workspace
    checkActiveWorkspace();
    
    // Load databases
    loadDatabaseList();
} 