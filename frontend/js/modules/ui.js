/**
 * ui.js - UI components and helpers
 */

import { appState } from '../core/app-core.js';
import { applyTheme } from './settings.js';
import { closeModal } from '../utils/modals.js';

// Initialize UI components
export function initializeUI() {
    console.log('Initializing UI components');
    
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Make sure the DOM is fully loaded before accessing elements
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUIComponents);
    } else {
        setupUIComponents();
    }
}

// Setup UI components after DOM is loaded
function setupUIComponents() {
    console.log('Setting up UI components');
    
    // Initialize sidebar state
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    // Log elements to verify they exist
    console.log('UI Elements:', {
        sidebar: sidebar,
        main: main
    });
    
    // Set initial sidebar state - collapsed on mobile, open on desktop
    if (sidebar) {
        if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
            if (main) main.classList.add('sidebar-closed');
        } else {
            sidebar.classList.add('open');
            if (main) main.classList.remove('sidebar-closed');
        }
    }
    
    // Apply theme based on saved settings or system preference
    applyTheme();

    // Set up sidebar toggle functionality
    setupSidebarToggle();
}

// Setup sidebar toggle functionality
export function setupSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
    const sidebarClose = document.getElementById('sidebar-close');

    // Create a single reusable function to handle sidebar toggle
    const toggleSidebarFn = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Toggle sidebar called from click event');
        toggleSidebar();
    };
    
    const closeSidebarFn = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close sidebar called from click event');
        closeSidebar();
    };

    // Add event listeners for sidebar toggles
    if (sidebarToggle) {
        // Remove any existing listeners to prevent duplicates
        sidebarToggle.removeEventListener('click', toggleSidebarFn);
        // Add the click listener
        sidebarToggle.addEventListener('click', toggleSidebarFn);
        // Clear any direct onclick property to avoid conflicts
        sidebarToggle.onclick = null;
        console.log('Added click listener to sidebar-toggle button');
    }
    
    if (sidebarToggleFixed) {
        // Remove any existing listeners to prevent duplicates
        sidebarToggleFixed.removeEventListener('click', toggleSidebarFn);
        // Add the click listener
        sidebarToggleFixed.addEventListener('click', toggleSidebarFn);
        // Clear any direct onclick property to avoid conflicts
        sidebarToggleFixed.onclick = null;
        console.log('Added click listener to sidebar-toggle-fixed button');
    }
    
    if (sidebarClose) {
        sidebarClose.removeEventListener('click', closeSidebarFn);
        sidebarClose.addEventListener('click', closeSidebarFn);
        console.log('Added click listener to sidebar-close button');
    }
    
    // Log sidebar elements to help debug
    console.log('Sidebar elements set up:', { 
        sidebar: sidebar, 
        sidebarToggle: sidebarToggle, 
        sidebarToggleFixed: sidebarToggleFixed,
        sidebarClose: sidebarClose
    });
}

// Function to close the sidebar
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    if (sidebar) {
        sidebar.classList.remove('open');
        if (main) {
            main.classList.add('sidebar-closed');
        }
    }
}

// Function to toggle sidebar state
export function toggleSidebar() {
    console.log('%c[UI] Toggle sidebar function called', 'background: #0284c7; color: white; padding: 2px 4px; border-radius: 4px;');
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    console.log('[UI] Elements found:', { 
        sidebar: sidebar, 
        main: main, 
        sidebarClassList: sidebar ? [...sidebar.classList] : null,
        mainClassList: main ? [...main.classList] : null
    });
    
    if (sidebar && main) {
        console.log('[UI] Before toggle - sidebar has open class:', sidebar.classList.contains('open'));
        
        // Toggle sidebar class
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            main.classList.add('sidebar-closed');
            console.log('[UI] Sidebar closed');
        } else {
            sidebar.classList.add('open');
            main.classList.remove('sidebar-closed');
            console.log('[UI] Sidebar opened');
        }
        
        console.log('[UI] After toggle - sidebar has open class:', sidebar.classList.contains('open'));
        
        // Update icon based on sidebar state
        const iconElement = document.querySelector('#sidebar-toggle-fixed i');
        if (iconElement) {
            console.log('[UI] Updating icon element:', iconElement);
            if (sidebar.classList.contains('open')) {
                iconElement.setAttribute('data-lucide', 'chevron-left');
            } else {
                iconElement.setAttribute('data-lucide', 'chevron-right');
            }
            if (window.lucide) {
                window.lucide.createIcons();
            } else {
                console.warn('[UI] Lucide library not found');
            }
        } else {
            console.warn('[UI] Icon element not found');
        }
    } else {
        console.warn('[UI] Sidebar or main content elements not found');
    }
}

// Function to show the sidebar programmatically
export function showSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    
    if (sidebar) {
        sidebar.classList.add('open');
        if (main) main.classList.remove('sidebar-closed');
        
        // Update icon
        const iconElement = document.querySelector('#sidebar-toggle-fixed i');
        if (iconElement) {
            iconElement.setAttribute('data-lucide', 'chevron-left');
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }
}

// Render the document list in the sidebar
export function renderDocumentList() {
    const pagesList = document.getElementById('pages-list');
    if (!pagesList) return;
    
    // Clear existing list
    pagesList.innerHTML = '';
    
    // Add each document to the list
    if (appState.documentList.length === 0) {
        pagesList.innerHTML = '<div class="py-2 px-3 text-surface-500 text-sm">No pages yet</div>';
        return;
    }
    
    appState.documentList.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-surface-100">
                <a href="#" class="flex items-center flex-grow" data-doc-id="${doc.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                         class="w-4 h-4 mr-2 text-surface-500">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span>${doc.title || 'Untitled'}</span>
                </a>
                <button class="delete-doc-btn text-surface-400 hover:text-red-500 p-1" data-doc-id="${doc.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                         class="w-4 h-4">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Add click handler to load document
        const loadDocFn = (e) => {
            e.preventDefault();
            import('./document.js').then(module => {
                module.loadDocument(doc.id);
            });
        };
        
        li.querySelector('a').addEventListener('click', loadDocFn);
        
        // Add delete handler
        const deleteFn = (e) => {
            e.stopPropagation();
            import('./document.js').then(module => {
                module.deleteDocument(doc.id);
            });
        };
        
        li.querySelector('.delete-doc-btn').addEventListener('click', deleteFn);
        
        pagesList.appendChild(li);
    });
}

// Render the workplaces list in the sidebar
export function renderDatabaseList() {
    const workplacesList = document.getElementById('workplaces-list');
    if (!workplacesList) return;
    
    // Clear existing list
    workplacesList.innerHTML = '';
    
    // Add each workplace to the list
    if (appState.workspaceList.length === 0) {
        workplacesList.innerHTML = '<div class="py-2 px-3 text-surface-500 text-sm">No workplaces yet</div>';
        return;
    }
    
    appState.workspaceList.forEach(workspace => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" class="flex items-center p-2 rounded-md hover:bg-surface-100" data-workspace-id="${workspace.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                     class="w-4 h-4 mr-2 text-surface-500">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span>${workspace.name}</span>
            </a>
        `;
        
        // Add click handler to select workspace
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            import('./workspace.js').then(module => {
                module.selectWorkspace(workspace.id);
            });
        });
        
        workplacesList.appendChild(li);
    });
    
    // NOTE: Event listener for manage-workplaces-btn is now managed in event-listeners.js
    // to prevent duplicate event handlers and ensure consistent behavior
}

// Complete the workspace selection process
export function completeWorkspaceSelection() {
    if (!appState.currentWorkspace) return;
    
    // Hide workspace selection screen with transition
    const workspaceScreen = document.getElementById('workspace-selection');
    if (workspaceScreen) {
        workspaceScreen.classList.remove('opacity-100');
        workspaceScreen.classList.add('opacity-0');
        
        const innerContent = workspaceScreen.querySelector('div');
        if (innerContent) {
            innerContent.classList.remove('scale-100');
            innerContent.classList.add('scale-95');
        }
        
        // Use a proper cleanup function
        setTimeout(() => {
            if (workspaceScreen.parentNode) {
                workspaceScreen.parentNode.removeChild(workspaceScreen);
            }
        }, 300);
    }
    
    // Show main content with animation
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.classList.add('opacity-0', 'transform', 'translate-y-4');
        
        setTimeout(() => {
            mainContent.classList.remove('opacity-0', 'transform', 'translate-y-4');
            mainContent.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-300');
        }, 10);
    }
    
    // Update UI to reflect current workspace
    updateWorkspaceUI();
    
    // Show sidebar on desktop
    showSidebar();
    
    // Responsive sidebar toggle based on screen size
    handleResponsiveSidebar(mainContent);
}

/**
 * Update UI elements to reflect the current workspace
 */
function updateWorkspaceUI() {
    if (!appState.currentWorkspace) return;
    
    // Update title element
    const titleEl = document.querySelector('.foundry-title');
    if (titleEl) {
        titleEl.textContent = appState.currentWorkspace.name;
    }
    
    // Update workspace switcher button to show the active workspace
    const workspaceSwitcher = document.getElementById('workspace-switcher');
    if (workspaceSwitcher) {
        // Reset any active styles
        workspaceSwitcher.classList.remove('active-button');
        
        // Add a span with the workspace name if it doesn't exist
        let nameSpan = workspaceSwitcher.querySelector('.workspace-name');
        if (!nameSpan) {
            // Find the existing span (generic "Switch Workspace" text)
            const existingSpan = workspaceSwitcher.querySelector('span');
            if (existingSpan) {
                // Update its content and add a class for styling
                existingSpan.innerHTML = `<span class="workspace-name">${appState.currentWorkspace.name}</span>`;
            }
        } else {
            // Just update the existing workspace name
            nameSpan.textContent = appState.currentWorkspace.name;
        }
        
        // Visual feedback that workspace has been switched
        setTimeout(() => {
            workspaceSwitcher.classList.add('workspace-updated');
            setTimeout(() => {
                workspaceSwitcher.classList.remove('workspace-updated');
            }, 1000);
        }, 300);
    }
}

/**
 * Handle responsive sidebar behavior based on screen size
 * @param {HTMLElement} mainContent - The main content element
 */
function handleResponsiveSidebar(mainContent) {
    if (window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            if (mainContent) mainContent.classList.add('sidebar-closed');
        }
    }
}

// Debug function to check sidebar toggle functionality
export function debugSidebar() {
    console.log('%c[DEBUG] Sidebar diagnostics started', 'background: #0284c7; color: white; padding: 2px 4px; border-radius: 4px;');
    const sidebar = document.querySelector('.sidebar');
    const main = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
    const sidebarClose = document.getElementById('sidebar-close');
    
    console.log('[DEBUG] Sidebar element exists:', !!sidebar);
    console.log('[DEBUG] Main content element exists:', !!main);
    console.log('[DEBUG] Sidebar toggle element exists:', !!sidebarToggle);
    console.log('[DEBUG] Sidebar toggle fixed element exists:', !!sidebarToggleFixed);
    console.log('[DEBUG] Sidebar close element exists:', !!sidebarClose);
    
    // Check if elements have onclick handlers
    console.log('[DEBUG] sidebar-toggle has onclick:', sidebarToggle && !!sidebarToggle.onclick);
    console.log('[DEBUG] sidebar-toggle-fixed has onclick:', sidebarToggleFixed && !!sidebarToggleFixed.onclick);
    
    if (sidebar) {
        console.log('[DEBUG] Sidebar classes:', [...sidebar.classList]);
    }
    
    if (main) {
        console.log('[DEBUG] Main content classes:', [...main.classList]);
    }
    
    // List all event listeners (for debugging purposes)
    console.log('[DEBUG] Adding direct click handlers as a fallback');
    
    // Force refresh event listeners
    if (sidebarToggle) {
        sidebarToggle.onclick = function() {
            console.log('[DEBUG] sidebar-toggle clicked directly');
            toggleSidebar();
        };
    }
    
    if (sidebarToggleFixed) {
        sidebarToggleFixed.onclick = function() {
            console.log('[DEBUG] sidebar-toggle-fixed clicked directly');
            toggleSidebar();
        };
    }
    
    // Manual toggle test
    console.log('[DEBUG] Attempting to manually toggle sidebar...');
    toggleSidebar();
    
    console.log('[DEBUG] Sidebar diagnostics complete');
    
    return "Sidebar debugging complete. Check your console for detailed information.";
}

// Function to set up the sidebar toggle fixed button directly
export function setupSidebarToggleFixed() {
    console.log('%c[UI] Setting up sidebar toggle fixed button', 'background: #0284c7; color: white; padding: 2px 4px; border-radius: 4px;');
    
    const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
    if (sidebarToggleFixed) {
        // Clear any existing onclick handler
        sidebarToggleFixed.onclick = null;
        
        // Remove any existing listeners first to prevent duplicates
        const toggleFunction = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('%c[UI] Sidebar toggle fixed clicked with event listener', 'background: green; color: white; padding: 2px 4px; border-radius: 4px;');
            toggleSidebar();
        };
        
        // Remove any existing click listeners (to avoid duplicates)
        try {
            sidebarToggleFixed.removeEventListener('click', toggleFunction);
        } catch (e) {
            // Ignore errors when trying to remove non-existent listeners
        }
        
        // Add a new event listener
        sidebarToggleFixed.addEventListener('click', toggleFunction);
        
        console.log('[UI] Sidebar toggle fixed button set up with click event listener');
    } else {
        console.warn('[UI] Could not find sidebar-toggle-fixed element');
    }
} 