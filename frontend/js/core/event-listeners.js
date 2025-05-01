/**
 * event-listeners.js - Event listener setup and management
 */

import { appState } from './app-core.js';
import { toggleSidebar } from '../modules/ui.js';
import { saveCurrentDocument, createNewDocument, exportCurrentDocument } from '../modules/document.js';
import { showWorkspaceSelection } from '../modules/workspace.js';
import { showShareDialog } from '../modules/dialogs.js';
import { showSettingsDialog } from '../modules/settings.js';
import { hideBlockMenu } from '../modules/blocks.js';
import { createNewDatabase } from '../modules/database.js';

// Set up all event listeners
export function setupEventListeners() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    // NOTE: Sidebar toggle event listeners are now handled in ui.js
    // We'll leave those out to prevent duplicate event listeners
    
    // Document operations
    document.getElementById('save-document')?.addEventListener('click', () => {
        saveCurrentDocument();
    });
    
    // New Page button in sidebar
    document.getElementById('new-page-btn')?.addEventListener('click', () => {
        createNewDocument();
    });
    
    // New Database button in sidebar
    const newDatabaseBtn = document.getElementById('new-database-btn');
    if (newDatabaseBtn) {
        console.log('Setting up new-database-btn event listener');
        newDatabaseBtn.addEventListener('click', () => {
            console.log('New database button clicked from event-listeners.js');
            createNewDatabase();
        });
    } else {
        console.warn('new-database-btn element not found in setupEventListeners');
    }
    
    // Workspace switcher button
    document.getElementById('workspace-switcher')?.addEventListener('click', () => {
        showWorkspaceSelection();
    });
    
    // Share button
    document.getElementById('share-button')?.addEventListener('click', () => {
        showShareDialog();
    });
    
    // Settings button
    document.getElementById('settings-button')?.addEventListener('click', () => {
        showSettingsDialog();
    });
    
    // Export button
    document.getElementById('export-button')?.addEventListener('click', () => {
        exportCurrentDocument();
    });
    
    // Block menu
    document.getElementById('block-menu')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('block-menu')) {
            hideBlockMenu();
        }
    });
    
    // Document title auto-save on blur
    document.getElementById('document-title')?.addEventListener('blur', () => {
        if (appState.currentDocument) {
            saveCurrentDocument(true); // Silent save
        }
    });
    
    // Add keyboard shortcut for saving (Ctrl+S / Cmd+S)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (appState.currentDocument) {
                saveCurrentDocument();
            }
        }
    });
    
    // Add window resize handler for responsive sidebar behavior
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            // Auto-show sidebar on desktop
            if (sidebar && !sidebar.classList.contains('open')) {
                sidebar.classList.add('open');
                if (main) main.classList.remove('sidebar-closed');
            }
        } else {
            // Auto-hide sidebar on mobile
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (main) main.classList.add('sidebar-closed');
            }
        }
    });
} 