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
import { toggleSidebar, debugSidebar } from './modules/ui.js';

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
        
        // Log important elements for debugging
        console.log('[INDEX] Key UI elements after initialization:');
        console.log('[INDEX] Sidebar Toggle:', document.getElementById('sidebar-toggle'));
        console.log('[INDEX] Sidebar Toggle Fixed:', document.getElementById('sidebar-toggle-fixed'));
        console.log('[INDEX] Sidebar Close:', document.getElementById('sidebar-close'));
        
        // Add direct click event handlers as a fallback
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            console.log('[INDEX] Adding direct click handler to sidebar-toggle');
            sidebarToggle.onclick = function() {
                console.log('[INDEX] sidebar-toggle clicked directly');
                toggleSidebar();
            };
        } else {
            console.warn('[INDEX] sidebar-toggle element not found');
        }
        
        const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
        if (sidebarToggleFixed) {
            console.log('[INDEX] Adding direct click handler to sidebar-toggle-fixed');
            sidebarToggleFixed.onclick = function() {
                console.log('[INDEX] sidebar-toggle-fixed clicked directly');
                toggleSidebar();
            };
        } else {
            console.warn('[INDEX] sidebar-toggle-fixed element not found');
        }
        
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
    
    // Check if sidebar toggle elements exist and have click handlers
    const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
    if (sidebarToggleFixed && !sidebarToggleFixed.onclick) {
        console.log('[INDEX] Reattaching click handler to sidebar-toggle-fixed');
        sidebarToggleFixed.onclick = function() {
            console.log('[INDEX] sidebar-toggle-fixed clicked (from window.onload)');
            toggleSidebar();
        };
    }
    
    // Run sidebar diagnostics after window load
    console.log('[INDEX] Running sidebar diagnostics after window load...');
    if (window.debugSidebar) {
        window.debugSidebar();
    }
}; 