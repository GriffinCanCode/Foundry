/**
 * app-core.js - Core application state and initialization
 */

import { loadSettings, applyTheme } from '../modules/settings.js';
import { initializeUI } from '../modules/ui.js';
import { checkActiveWorkspace } from '../modules/workspace.js';
import { loadDatabaseList } from '../modules/database.js';
import { runWhenIdle } from '../utils/optimizer.js';

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
export async function initializeApp() {
    console.log('Initializing app core...');
    
    // Critical initialization tasks (required for immediate functionality)
    await loadSettings();
    initializeUI();
    checkActiveWorkspace();
    
    // Mark app as initialized
    appState.appInitialized = true;
    
    // Non-critical tasks that can be deferred
    runWhenIdle(() => {
        console.log('Running non-critical initialization tasks during idle time');
        
        // Load databases (can be loaded in the background)
        loadDatabaseList();
        
        // Load additional features that aren't needed immediately
        loadNonCriticalFeatures();
    });
}

// Load features that aren't needed for immediate app functionality
function loadNonCriticalFeatures() {
    // Load analytics if configured
    if (appState.settings.enableAnalytics) {
        import('../utils/analytics.js').then(module => {
            module.initializeAnalytics();
        }).catch(err => {
            console.warn('Failed to load analytics module (this is normal if analytics is not configured)', err);
        });
    }
    
    // Prefetch templates for better performance when user needs them
    if (appState.settings.enableTemplates) {
        import('../modules/templates.js').then(module => {
            module.prefetchTemplates();
        }).catch(err => {
            console.warn('Failed to prefetch templates (this is normal if templates are not configured)', err);
        });
    }
    
    // Preload any other modules that might be needed later
    import('../utils/export.js').catch(err => {
        console.warn('Failed to preload export module (this is normal)');
    });
} 