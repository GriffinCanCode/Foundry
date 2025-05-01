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
    appInitialized: false,
    pendingAction: null
};

// Initialize the application
export async function initializeApp() {
    console.log('Initializing app core...');
    
    // Check if we should show the landing page instead of the main app
    // Skip landing page if 'skipLanding=true' or a specific action is requested
    const urlParams = new URLSearchParams(window.location.search);
    const skipLanding = urlParams.get('skipLanding') === 'true';
    const hasAction = urlParams.has('create') || urlParams.has('load') || urlParams.has('view');
    
    if (!skipLanding && !hasAction && window.location.pathname.endsWith('index.html')) {
        // Redirect to landing page if we're on index.html
        window.location.href = 'landing.html';
        return;
    }
    
    // Process specific actions that might come from the landing page
    if (urlParams.has('create') && urlParams.get('create') === 'database') {
        // Will trigger database creation after app loads
        appState.pendingAction = {
            type: 'createDatabase'
        };
    }
    
    // Critical initialization tasks (required for immediate functionality)
    await loadSettings();
    initializeUI();
    checkActiveWorkspace();
    
    // Mark app as initialized
    appState.appInitialized = true;
    
    // Handle any pending actions
    if (appState.pendingAction) {
        processPendingAction(appState.pendingAction);
    }
    
    // Non-critical tasks that can be deferred
    runWhenIdle(() => {
        console.log('Running non-critical initialization tasks during idle time');
        
        // Load databases (can be loaded in the background)
        loadDatabaseList();
        
        // Load additional features that aren't needed immediately
        loadNonCriticalFeatures();
    });
}

// Process any pending actions that were triggered from the landing page
function processPendingAction(action) {
    import('../modules/database.js').then(module => {
        switch (action.type) {
            case 'createDatabase':
                module.createNewDatabase();
                break;
        }
    }).catch(err => {
        console.error('Failed to process pending action', err);
    });
    
    // Clear the pending action
    appState.pendingAction = null;
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