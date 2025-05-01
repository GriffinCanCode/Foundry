/**
 * index.js - Main application entry point
 */

// ============= DEBUGGING SECTION =============
// These messages should appear in the console regardless of other errors
console.clear(); // Clear existing console
console.log('%c👋 FOUNDRY DEBUG MODE ACTIVATED', 'font-size: 14px; font-weight: bold; color: white; background: #0284c7; padding: 8px 12px; border-radius: 4px;');
console.log('%c📋 Check below for detailed logs', 'font-size: 12px; color: #0284c7; font-weight: bold;');

// Add helper functions to window for debugging from browser console
window.testConsoleLog = function() {
    console.log('%c✅ Console logging is working!', 'color: green; font-weight: bold;');
    return "Console test successful. Check browser console.";
};

// Show a timestamp for debugging sequence
console.log('[DEBUG] Script started at:', new Date().toISOString());
// =============================================

console.log('%c[INDEX] Script loading started', 'background: #0284c7; color: white; padding: 2px 4px; border-radius: 4px;');

import { initializeApp, appState } from './core/app-core.js';
import { setupEventListeners } from './core/event-listeners.js';
import { toggleSidebar, debugSidebar, setupSidebarToggleFixed } from './modules/ui.js';

// Initialize app when document is ready
function initialize() {
    console.log('%c[INDEX] DOM fully loaded - initializing app', 'background: #0284c7; color: white; padding: 2px 4px; border-radius: 4px;');
    
    try {
        console.log('[INDEX] Initializing core app...');
        initializeApp();
        
        console.log('[INDEX] Setting up event listeners...');
        setupEventListeners();
        
        // Make debug function available globally
        window.debugSidebar = debugSidebar;
        console.log('[INDEX] Debug sidebar function attached to window object');
        
        // Set up the sidebar toggle buttons using the proper UI module functions
        import('./modules/ui.js').then(uiModule => {
            uiModule.setupSidebarToggle();
            uiModule.setupSidebarToggleFixed();
            console.log('[INDEX] Sidebar toggle buttons set up through UI module');
        }).catch(error => {
            console.error('[INDEX] Error setting up sidebar toggle:', error);
        });
        
        // Log important elements for debugging
        console.log('[INDEX] Key UI elements after initialization:');
        console.log('[INDEX] Sidebar Toggle:', document.getElementById('sidebar-toggle'));
        console.log('[INDEX] Sidebar Toggle Fixed:', document.getElementById('sidebar-toggle-fixed'));
        console.log('[INDEX] Sidebar Close:', document.getElementById('sidebar-close'));
        
        console.log('[INDEX] Initialization complete');
    } catch (error) {
        console.error('[INDEX] Error during initialization:', error);
    }
}

// Use both DOMContentLoaded and window.onload to ensure everything is loaded
if (document.readyState === 'loading') {
    console.log('[INDEX] Document still loading, waiting for DOMContentLoaded event');
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    console.log('[INDEX] Document already loaded, initializing immediately');
    initialize();
}

// Additional safety check with window.onload
window.onload = function() {
    console.log('[INDEX] Window fully loaded - checking initialization');
    
    // Set up sidebar toggle buttons again to ensure they work
    import('./modules/ui.js').then(uiModule => {
        uiModule.setupSidebarToggle();
        uiModule.setupSidebarToggleFixed();
        console.log('[INDEX] Sidebar toggle buttons set up after window load');
    }).catch(error => {
        console.error('[INDEX] Error setting up sidebar toggle after window load:', error);
    });
    
    // Run sidebar diagnostics after window load
    console.log('[INDEX] Running sidebar diagnostics after window load...');
    if (window.debugSidebar) {
        window.debugSidebar();
    }
    
    // Create a special button to activate sidebar toggle for testing
    console.log('[INDEX] Creating emergency sidebar toggle button for testing...');
    const emergencyBtn = document.createElement('button');
    emergencyBtn.textContent = "Emergency Toggle Sidebar";
    emergencyBtn.style.position = "fixed";
    emergencyBtn.style.bottom = "10px";
    emergencyBtn.style.right = "10px";
    emergencyBtn.style.zIndex = "9999";
    emergencyBtn.style.padding = "10px";
    emergencyBtn.style.backgroundColor = "#0284c7";
    emergencyBtn.style.color = "white";
    emergencyBtn.style.borderRadius = "4px";
    emergencyBtn.style.border = "none";
    emergencyBtn.style.cursor = "pointer";
    
    emergencyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[INDEX] Emergency sidebar toggle clicked');
        toggleSidebar();
    });
    
    // Only add the emergency button in debug mode
    if (document.querySelector('.sidebar')) {
        document.body.appendChild(emergencyBtn);
    }
}; 