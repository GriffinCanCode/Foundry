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

// Edit a workspace
export async function editWorkspace(id) {
  try {
    // Load workspace from storage
    const workspace = await loadWorkspaceFromStorage(id);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    // Create the edit workspace modal HTML
    const modalHTML = `
    <div id="edit-workspace-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-display font-semibold text-surface-900">Edit Workspace</h3>
                <button id="close-edit-workspace-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <form id="edit-workspace-form">
                <div class="mb-4">
                    <label for="edit-workspace-name" class="block text-surface-700 mb-2">Workspace Name</label>
                    <input type="text" id="edit-workspace-name" class="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="My Workspace" value="${workspace.name}" required>
                </div>
                
                <div class="mb-6">
                    <label for="edit-workspace-description" class="block text-surface-700 mb-2">Description (Optional)</label>
                    <textarea id="edit-workspace-description" class="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" rows="3" placeholder="What's this workspace for?">${workspace.description || ''}</textarea>
                </div>
                
                <input type="hidden" id="edit-workspace-id" value="${workspace.id}">
                
                <div class="flex justify-end">
                    <button type="button" id="cancel-workspace-edit" class="px-4 py-2 mr-2 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-100 transition-colors">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    const modalElement = modalContainer.firstChild;
    document.body.appendChild(modalElement);
    
    // Initialize icons
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Set up event handlers
    const closeModal = () => {
      const modal = document.getElementById('edit-workspace-modal');
      if (modal) {
        // Add fade-out animation
        modal.classList.add('opacity-0');
        setTimeout(() => {
          if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
        }, 300);
      }
    };
    
    const handleFormSubmit = async (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('edit-workspace-name');
      const descriptionInput = document.getElementById('edit-workspace-description');
      const idInput = document.getElementById('edit-workspace-id');
      
      if (!nameInput || !idInput) {
        showNotification('Form fields not found', 'error');
        return;
      }
      
      const workspaceId = idInput.value;
      const name = nameInput.value.trim();
      const description = descriptionInput ? descriptionInput.value.trim() : '';
      
      if (!name) {
        showNotification('Workspace name is required', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> Saving...';
        
        // Get the workspace from storage
        const workspace = await loadWorkspaceFromStorage(workspaceId);
        if (!workspace) {
          throw new Error('Workspace not found');
        }
        
        // Update workspace
        workspace.name = name;
        workspace.description = description;
        workspace.updated = new Date().toISOString();
        
        // Save to storage
        await saveWorkspaceToStorage(workspace);
        
        // Update app state
        const index = appState.workspaceList.findIndex(w => w.id === workspaceId);
        if (index !== -1) {
          appState.workspaceList[index] = workspace;
        }
        
        // If this is the current workspace, update it
        if (appState.currentWorkspace && appState.currentWorkspace.id === workspaceId) {
          appState.currentWorkspace = workspace;
        }
        
        // Update UI
        import('./ui.js').then(module => {
          module.renderDatabaseList();
          if (appState.currentWorkspace && appState.currentWorkspace.id === workspaceId) {
            module.updateWorkspaceUI();
          }
        });
        
        showNotification('Workspace updated successfully', 'success');
        closeModal();
      } catch (error) {
        console.error('Error updating workspace:', error);
        showNotification('Failed to update workspace', 'error');
        
        // Reset submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Save Changes';
        }
      }
    };
    
    // Attach event listeners using best practices
    const form = document.getElementById('edit-workspace-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
    
    const closeBtn = document.getElementById('close-edit-workspace-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }
    
    const cancelBtn = document.getElementById('cancel-workspace-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }
    
    // Also allow closing with ESC key
    const escKeyHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escKeyHandler);
      }
    };
    document.addEventListener('keydown', escKeyHandler);
    
    // Focus on the name input
    setTimeout(() => {
      const nameInput = document.getElementById('edit-workspace-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 100);
    
  } catch (error) {
    console.error('Error editing workspace:', error);
    showNotification('Failed to edit workspace', 'error');
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