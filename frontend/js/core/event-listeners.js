/**
 * event-listeners.js - Event listener setup and management
 */

import { appState } from './app-core.js';
import { toggleSidebar } from '../modules/ui.js';
import { saveCurrentDocument, createNewDocument, exportCurrentDocument } from '../modules/document.js';
import { showWorkspaceSelection } from '../modules/workspace.js';
import { showShareDialog } from '../modules/dialogs.js';
import { showSettingsDialog } from '../modules/settings.js';
import { hideBlockMenu, showSlashCommandMenu } from '../modules/blocks.js';
import { createNewDatabase } from '../modules/database.js';
import { debounce, delegateEvent } from '../utils/optimizer.js';

// Set up all event listeners with performance optimizations
export function setupEventListeners() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    // Use event delegation for sidebar buttons
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) {
        delegateEvent(sidebarEl, 'click', '#new-page-btn', () => {
            createNewDocument();
        });
        
        delegateEvent(sidebarEl, 'click', '#new-database-btn', () => {
            console.log('New database button clicked via delegation');
            createNewDatabase();
        });
        
        delegateEvent(sidebarEl, 'click', '#workspace-switcher', () => {
            showWorkspaceSelection();
        });
    }
    
    // Use event delegation for toolbar buttons
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        delegateEvent(toolbar, 'click', '#save-document', () => {
            saveCurrentDocument();
        });
        
        delegateEvent(toolbar, 'click', '#share-button', () => {
            showShareDialog();
        });
        
        delegateEvent(toolbar, 'click', '#settings-button', () => {
            showSettingsDialog();
        });
        
        delegateEvent(toolbar, 'click', '#export-button', () => {
            exportCurrentDocument();
        });
    }
    
    // Individual event listeners for specific elements that need direct binding
    
    // Block menu click outside to close
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
    
    // Global keyboard event listener for slash command
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.getAttribute('contenteditable') === 'true') {
            // Only trigger on editable elements like blocks
            const selection = window.getSelection();
            const anchorNode = selection.anchorNode;
            
            if (!anchorNode) return;
            
            // Find the current block container
            const blockContainer = anchorNode.nodeType === 3 
                ? anchorNode.parentElement.closest('.block-container')
                : anchorNode.closest('.block-container');
                
            if (blockContainer) {
                const editableElement = blockContainer.querySelector('[contenteditable="true"]');
                if (editableElement && (editableElement.textContent.trim() === '' || selection.anchorOffset === 0)) {
                    e.preventDefault();
                    console.log('Global slash command triggered for block:', blockContainer);
                    
                    // Clear existing slash if needed
                    if (editableElement.textContent === '/') {
                        editableElement.textContent = '';
                    }
                    
                    // Show the slash command menu
                    showSlashCommandMenu(blockContainer);
                }
            }
        }
    });
    
    // Add debounced window resize handler for responsive sidebar behavior
    const debouncedResizeHandler = debounce(() => {
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
    }, 200); // 200ms debounce time
    
    window.addEventListener('resize', debouncedResizeHandler);
} 