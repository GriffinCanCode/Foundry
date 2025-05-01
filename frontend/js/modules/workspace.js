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
  <div id="workspace-selection" class="fixed inset-0 bg-white z-50 flex items-center justify-center opacity-100 transition-opacity duration-300">
      <div class="max-w-xl w-full px-6 py-8 transform transition-all duration-300 scale-100">
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
  
  // Add to body
  const workspaceContainer = document.createElement('div');
  workspaceContainer.innerHTML = workspaceHTML;
  document.body.appendChild(workspaceContainer.firstChild);
  
  // Initialize icons
  if (window.lucide) {
      lucide.createIcons();
  }
  
  // Add event listeners
  document.querySelectorAll('.workspace-item').forEach(item => {
      item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          if (id) selectWorkspace(id);
      });
  });
  
  document.getElementById('create-workspace-btn').addEventListener('click', () => {
      showCreateWorkspaceDialog();
  });
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