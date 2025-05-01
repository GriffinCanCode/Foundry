/**
 * workspace.js - Workspace management
 */

import { appState } from '../core/app-core.js';
import { showNotification } from '../utils/notifications.js';
import { showCreateWorkspaceDialog } from './dialogs.js';
import { completeWorkspaceSelection } from './ui.js';
import { loadDocumentList } from './document.js';

// Check if there's an active workspace
export function checkActiveWorkspace() {
    // Try to load workspaces from local storage
    loadWorkspaces();
    
    // Check if we have an active workspace in local storage
    const activeId = localStorage.getItem('foundry_active_workspace');
    if (activeId) {
        const workspace = appState.workspaceList.find(w => w.id === activeId);
        if (workspace) {
            // Set active workspace
            selectWorkspace(workspace.id);
            return;
        }
    }
    
    // If we have any workspaces, show the selection screen
    if (appState.workspaceList.length > 0) {
        showWorkspaceSelection();
    } else {
        // No workspaces, show the create workspace dialog
        showCreateWorkspaceDialog();
    }
}

// Create a new workspace
export function createWorkspace(name, description = '') {
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
    
    // Add to app state
    appState.workspaceList.push(newWorkspace);
    
    // Save workspaces
    saveWorkspaces();
    
    // Select the new workspace
    selectWorkspace(workspaceId);
    
    showNotification('Workspace created successfully', 'success');
}

// Select a workspace
export function selectWorkspace(id) {
    // Find workspace in state
    const workspace = appState.workspaceList.find(w => w.id === id);
    if (!workspace) {
        showNotification('Workspace not found', 'error');
        return;
    }
    
    // Set as current workspace
    appState.currentWorkspace = workspace;
    
    // Save active workspace to local storage
    localStorage.setItem('foundry_active_workspace', id);
    
    // Update workspace last accessed timestamp
    workspace.lastAccessed = new Date().toISOString();
    saveWorkspaces();
    
    // Load documents for this workspace
    loadDocumentList();
    
    // Update UI to reflect workspace selection
    completeWorkspaceSelection();
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

// Load workspaces from local storage
function loadWorkspaces() {
    try {
        const workspaces = localStorage.getItem('foundry_workspaces');
        if (workspaces) {
            appState.workspaceList = JSON.parse(workspaces);
        } else {
            appState.workspaceList = [];
        }
    } catch (err) {
        console.error('Error loading workspaces:', err);
        appState.workspaceList = [];
    }
}

// Save workspaces to local storage
function saveWorkspaces() {
    try {
        localStorage.setItem('foundry_workspaces', JSON.stringify(appState.workspaceList));
    } catch (err) {
        console.error('Error saving workspaces:', err);
        showNotification('Failed to save workspaces', 'error');
    }
} 