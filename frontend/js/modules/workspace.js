/**
 * workspace.js - Workspace management
 */

import { appState } from '../core/app-core.js';
import { showNotification } from '../utils/notifications.js';
import { showCreateWorkspaceDialog } from './dialogs.js';
import { completeWorkspaceSelection } from './ui.js';
import { loadDocumentList } from './document.js';
import {
  initializeWorkspaceStorage,
  saveWorkspace as saveWorkspaceToStorage,
  loadWorkspace as loadWorkspaceFromStorage,
  listWorkspaces as listWorkspacesFromStorage,
  getCurrentWorkspace as getActiveWorkspace,
  setCurrentWorkspace as setActiveWorkspace
} from '../storage/workspace-storage.js';
import { getSetting, setSetting } from '../storage/settings-storage.js';

// Initialize workspace storage when module is imported
initializeWorkspaceStorage().catch(error => {
  console.error('Failed to initialize workspace storage:', error);
});

// Check if there's an active workspace
export async function checkActiveWorkspace() {
  try {
    // Load workspaces from storage
    await loadWorkspaces();
    
    // Try to get active workspace from settings
    const workspace = await getActiveWorkspace();
    
    if (workspace) {
      // Set active workspace in app state
      appState.currentWorkspace = workspace;
      
      // Load documents for this workspace
      loadDocumentList();
      
      // Update UI to reflect workspace selection
      completeWorkspaceSelection();
      return;
    }
    
    // If we have any workspaces, show the selection screen
    if (appState.workspaceList.length > 0) {
      showWorkspaceSelection();
    } else {
      // No workspaces, show the create workspace dialog
      showCreateWorkspaceDialog();
    }
  } catch (error) {
    console.error('Error checking active workspace:', error);
    showNotification('Failed to load workspace information', 'error');
  }
}

// Create a new workspace
export async function createWorkspace(name, description = '') {
  try {
    // Generate unique ID (in production, this would be from the server)
    const workspaceId = 'ws_' + Date.now();
    
    // Create workspace object
    const newWorkspace = {
      id: workspaceId,
      name,
      description,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    // Save to storage
    await saveWorkspaceToStorage(newWorkspace);
    
    // Add to app state
    appState.workspaceList.push(newWorkspace);
    
    // Select the new workspace
    await selectWorkspace(workspaceId);
    
    showNotification('Workspace created successfully', 'success');
  } catch (error) {
    console.error('Error creating workspace:', error);
    showNotification('Failed to create workspace', 'error');
  }
}

// Select a workspace
export async function selectWorkspace(id) {
  try {
    // Load workspace from storage
    const workspace = await loadWorkspaceFromStorage(id);
    
    // Set as current workspace in app state
    appState.currentWorkspace = workspace;
    
    // Set as active workspace in storage
    await setActiveWorkspace(id);
    
    // Update workspace last accessed timestamp
    workspace.lastAccessed = new Date().toISOString();
    await saveWorkspaceToStorage(workspace);
    
    // Load documents for this workspace
    loadDocumentList();
    
    // Update UI to reflect workspace selection
    completeWorkspaceSelection();
  } catch (error) {
    console.error('Error selecting workspace:', error);
    showNotification('Workspace not found', 'error');
  }
}

// Show workspace selection screen
export function showWorkspaceSelection() {
  // Create the workspace selection screen HTML
  const workspaceHTML = `
  <div id="workspace-selection" class="fixed inset-0 bg-white z-50 flex items-center justify-center opacity-0 transition-opacity duration-300">
      <div class="max-w-xl w-full px-6 py-8 transform transition-all duration-300 scale-95">
          <h1 class="text-3xl font-display font-bold text-surface-900 mb-6">Select Workspace</h1>
          
          <div class="space-y-4 mb-8" id="workspace-list">
              ${renderWorkspaceList()}
          </div>
          
          <button id="create-workspace-btn" class="w-full px-4 py-3 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Workspace
          </button>
      </div>
  </div>
  `;
  
  // First, check if there's a transition in progress and wait for it to complete
  const existingWorkspaceSelection = document.getElementById('workspace-selection');
  if (existingWorkspaceSelection) {
    // If there's already a visible selection screen, just make sure events are bound
    if (existingWorkspaceSelection.classList.contains('opacity-100')) {
      setupWorkspaceSelectionEvents();
      return;
    }
    
    // Otherwise, remove the existing one before creating a new one
    document.body.removeChild(existingWorkspaceSelection);
  }
  
  // Add to body
  const workspaceContainer = document.createElement('div');
  workspaceContainer.innerHTML = workspaceHTML;
  const selectionElement = workspaceContainer.firstChild;
  document.body.appendChild(selectionElement);
  
  // Initialize icons
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Set up event handlers
  setupWorkspaceSelectionEvents();
  
  // Trigger animation to fade in 
  setTimeout(() => {
    const selection = document.getElementById('workspace-selection');
    if (selection) {
      selection.classList.add('opacity-100');
      const innerContent = selection.querySelector('div');
      if (innerContent) {
        innerContent.classList.add('scale-100');
        innerContent.classList.remove('scale-95');
      }
    }
  }, 10);
}

/**
 * Set up event handlers for the workspace selection screen
 */
function setupWorkspaceSelectionEvents() {
  // Ensure we have the workspace selection element
  const workspaceSelection = document.getElementById('workspace-selection');
  if (!workspaceSelection) return;
  
  // Define reusable handlers
  // Using function declaration instead of arrow function to ensure 'this' refers to the clicked element
  function workspaceItemHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Provide visual feedback
    this.classList.add('bg-surface-200');
    
    // Get workspace ID
    const id = this.getAttribute('data-id');
    if (!id) return;
    
    // Add loading state
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center';
    loadingIndicator.innerHTML = '<div class="animate-pulse text-primary-600">Loading...</div>';
    this.style.position = 'relative';
    this.appendChild(loadingIndicator);
    
    // Select workspace with slight delay to show loading state
    setTimeout(() => {
      selectWorkspace(id).catch(err => {
        console.error('Error selecting workspace:', err);
        this.classList.remove('bg-surface-200');
        this.removeChild(loadingIndicator);
        showNotification('Failed to switch to workspace', 'error');
      });
    }, 150);
  }
  
  // Define handler for create workspace button
  function createWorkspaceHandler(e) {
    e.preventDefault();
    
    // Add visual feedback
    this.classList.add('bg-primary-100');
    setTimeout(() => {
      this.classList.remove('bg-primary-100');
    }, 300);
    
    showCreateWorkspaceDialog();
  }
  
  // Clean up existing handlers by attaching with delegation
  // This avoids issues with stale handlers
  workspaceSelection.addEventListener('click', function(e) {
    // Handle workspace item clicks
    if (e.target.closest('.workspace-item')) {
      const workspaceItem = e.target.closest('.workspace-item');
      workspaceItemHandler.call(workspaceItem, e);
    }
    
    // Handle create workspace button click
    if (e.target.closest('#create-workspace-btn')) {
      const createBtn = e.target.closest('#create-workspace-btn');
      createWorkspaceHandler.call(createBtn, e);
    }
  });
  
  // Also allow closing the workspace selection with ESC key
  function escKeyHandler(e) {
    if (e.key === 'Escape') {
      const selection = document.getElementById('workspace-selection');
      if (selection) {
        // Animate out
        selection.classList.remove('opacity-100');
        selection.classList.add('opacity-0');
        const innerContent = selection.querySelector('div');
        if (innerContent) {
          innerContent.classList.remove('scale-100');
          innerContent.classList.add('scale-95');
        }
        
        // Remove after animation
        setTimeout(() => {
          if (selection.parentNode) {
            selection.parentNode.removeChild(selection);
          }
        }, 300);
        
        // Remove this event listener
        document.removeEventListener('keydown', escKeyHandler);
      }
    }
  }
  
  // Add ESC key handler
  document.removeEventListener('keydown', escKeyHandler);
  document.addEventListener('keydown', escKeyHandler);
}

// Render workspace list items
function renderWorkspaceList() {
  if (appState.workspaceList.length === 0) {
      return `<div class="text-center text-surface-500 py-8">No workspaces found</div>`;
  }
  
  return appState.workspaceList.map(workspace => `
      <div class="workspace-item cursor-pointer bg-surface-50 hover:bg-surface-100 p-4 rounded-lg transition-colors" data-id="${workspace.id}">
          <h3 class="font-medium text-surface-900">${workspace.name}</h3>
          ${workspace.description ? `<p class="text-surface-500 text-sm mt-1">${workspace.description}</p>` : ''}
          <div class="flex items-center mt-2 text-xs text-surface-400">
              <span>Created ${formatDate(workspace.created)}</span>
              ${workspace.lastAccessed ? `<span class="ml-auto">Last accessed ${formatDate(workspace.lastAccessed)}</span>` : ''}
          </div>
      </div>
  `).join('');
}

// Helper to format dates in a human-readable way
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
  });
}

// Load workspaces from storage
export async function loadWorkspaces() {
  try {
    // Load from storage
    const workspaces = await listWorkspacesFromStorage();
    
    // Update app state
    appState.workspaceList = workspaces;
    
    // Update the UI to show workspaces in the sidebar
    import('../modules/ui.js').then(module => {
      module.renderDatabaseList();
    }).catch(err => {
      console.error('Error rendering workspace list:', err);
    });
    
    return workspaces;
  } catch (error) {
    console.error('Error loading workspaces:', error);
    appState.workspaceList = [];
    return [];
  }
}

// Deprecated: Old function to save workspaces to localStorage
// Kept for backward compatibility, will be removed in future versions
function saveWorkspaces() {
  console.warn('saveWorkspaces is deprecated, workspaces are saved individually now');
  
  // Save each workspace in the list
  if (appState.workspaceList && appState.workspaceList.length > 0) {
    appState.workspaceList.forEach(workspace => {
      saveWorkspaceToStorage(workspace).catch(err => {
        console.error('Error saving workspace during list save:', err);
      });
    });
  }
} 