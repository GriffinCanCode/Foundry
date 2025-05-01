/**
 * app.js - Frontend/Backend Integration for Foundry
 * Handles document management, database operations, and UI interactions
 */

// Global state for the application
const appState = {
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
    appInitialized: false
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    // Load settings
    loadSettings();
    
    // Initialize UI components
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if we need to show the workspace selection first
    if (!appState.currentWorkspace) {
        console.log('No workspace found, showing workspace selection');
        // Hide main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        // Show workspace selection
        const workspaceSelection = document.getElementById('workspace-selection');
        if (workspaceSelection) {
            workspaceSelection.style.display = 'flex';
        }
        
        showWorkspaceSelection();
    } else {
        console.log('Workspace found, loading content:', appState.currentWorkspace.name);
        // Load workspace content
        loadWorkspaceContent(appState.currentWorkspace.id);
    }
});

// Show workspace selection screen
function showWorkspaceSelection() {
    console.log('Showing workspace selection screen');
    // Hide main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // Create and show workspace selection screen
    let workspaceScreen = document.getElementById('workspace-selection');
    if (!workspaceScreen) {
        workspaceScreen = document.createElement('div');
        workspaceScreen.id = 'workspace-selection';
        workspaceScreen.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4';
        
        workspaceScreen.innerHTML = `
            <div class="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
                <h1 class="text-2xl font-bold mb-6 text-center">Welcome to Foundry</h1>
                
                <div class="mb-6">
                    <h2 class="text-lg font-medium mb-3">Select a Workspace</h2>
                    <div id="workspace-list" class="border rounded-md divide-y">
                        <p class="p-4 text-gray-500 text-center">Loading workspaces...</p>
                    </div>
                </div>
                
                <div class="flex justify-between items-center">
                    <button id="create-workspace-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Create New Workspace
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(workspaceScreen);
        
        // Initialize icons
        if (window.lucide) {
            lucide.createIcons();
        }
    } else {
        workspaceScreen.style.display = 'flex';
    }
    
    // Add event listener for Create Workspace button
    document.getElementById('create-workspace-btn')?.addEventListener('click', showCreateWorkspaceDialog);
    
    // Load workspace list
    loadWorkspaceList();
}

// Load list of workspaces
function loadWorkspaceList() {
    const workspaceListEl = document.getElementById('workspace-list');
    if (!workspaceListEl) return;
    
    if (!window.foundryAPI) {
        console.log('foundryAPI not available, using local storage fallback');
        // Use localStorage as fallback
        try {
            const savedList = localStorage.getItem('foundry_workspace_list');
            if (savedList) {
                appState.workspaceList = JSON.parse(savedList);
                renderWorkspaceList();
            } else {
                // No workspaces yet
                workspaceListEl.innerHTML = `
                    <p class="p-4 text-gray-500 text-center">No workspaces yet. Create your first workspace to get started.</p>
                `;
            }
        } catch (err) {
            console.error('Error loading workspace list from localStorage:', err);
            workspaceListEl.innerHTML = `
                <p class="p-4 text-red-500 text-center">Error loading workspaces. Please try again.</p>
            `;
        }
        return;
    }
    
    // Use Electron API to list workspaces
    window.foundryAPI.listWorkspaces()
        .then(result => {
            if (result.success) {
                appState.workspaceList = result.workspaces;
                renderWorkspaceList();
            } else {
                console.error('Error loading workspace list:', result.error);
                workspaceListEl.innerHTML = `
                    <p class="p-4 text-red-500 text-center">Error loading workspaces: ${result.error}</p>
                `;
            }
        })
        .catch(err => {
            console.error('Error loading workspace list:', err);
            workspaceListEl.innerHTML = `
                <p class="p-4 text-red-500 text-center">Error loading workspaces. Please try again.</p>
            `;
        });
}

// Render the list of workspaces
function renderWorkspaceList() {
    const workspaceListEl = document.getElementById('workspace-list');
    if (!workspaceListEl) return;
    
    // Clear existing list
    workspaceListEl.innerHTML = '';
    
    // Add each workspace to the list
    if (appState.workspaceList.length === 0) {
        workspaceListEl.innerHTML = `
            <p class="p-4 text-gray-500 text-center">No workspaces yet. Create your first workspace to get started.</p>
        `;
        return;
    }
    
    appState.workspaceList.forEach(workspace => {
        const item = document.createElement('div');
        item.className = 'p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center';
        item.innerHTML = `
            <div>
                <h3 class="font-medium">${workspace.name}</h3>
                <p class="text-sm text-gray-500">Created: ${new Date(workspace.createdAt).toLocaleDateString()}</p>
            </div>
            <button class="text-blue-600 hover:text-blue-800">Open</button>
        `;
        
        // Add click handler to select workspace
        item.addEventListener('click', () => {
            selectWorkspace(workspace.id);
        });
        
        workspaceListEl.appendChild(item);
    });
}

// Show dialog to create a new workspace
function showCreateWorkspaceDialog() {
    // Create modal for creating a workspace
    const modalHTML = `
    <div id="create-workspace-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Create New Workspace</h3>
                <button id="close-workspace-modal" class="p-1 rounded hover:bg-gray-100">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Workspace Name</label>
                    <input type="text" id="workspace-name" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                           placeholder="My Workspace">
                </div>
                
                <div class="pt-3 flex justify-end">
                    <button id="workspace-cancel-btn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2">
                        Cancel
                    </button>
                    <button id="workspace-create-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Create
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Add event listeners
    document.getElementById('close-workspace-modal').addEventListener('click', () => {
        document.getElementById('create-workspace-modal').remove();
    });
    
    document.getElementById('workspace-cancel-btn').addEventListener('click', () => {
        document.getElementById('create-workspace-modal').remove();
    });
    
    document.getElementById('workspace-create-btn').addEventListener('click', () => {
        const workspaceName = document.getElementById('workspace-name').value.trim();
        if (!workspaceName) {
            alert('Please enter a workspace name');
            return;
        }
        
        createWorkspace(workspaceName);
        document.getElementById('create-workspace-modal').remove();
    });
}

// Create a new workspace
function createWorkspace(name) {
    const workspaceData = {
        id: Date.now().toString(),
        name: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!window.foundryAPI) {
        // Fallback for when running without Electron
        console.log('Workspace data (would be created):', workspaceData);
        
        // Update workspace list in localStorage
        let workspaceList = [];
        try {
            const savedList = localStorage.getItem('foundry_workspace_list');
            if (savedList) {
                workspaceList = JSON.parse(savedList);
            }
        } catch (err) {
            console.error('Error parsing workspace list:', err);
        }
        
        workspaceList.push(workspaceData);
        localStorage.setItem('foundry_workspace_list', JSON.stringify(workspaceList));
        appState.workspaceList = workspaceList;
        
        // Select the new workspace
        selectWorkspace(workspaceData.id);
        
        showNotification('Workspace created successfully');
        return;
    }
    
    // Use Electron API to create workspace
    window.foundryAPI.createWorkspace(workspaceData)
        .then(result => {
            if (result.success) {
                showNotification('Workspace created successfully');
                
                // Add to the local list
                const newWorkspace = {
                    id: result.id || workspaceData.id,
                    name: name,
                    createdAt: workspaceData.createdAt,
                    updatedAt: workspaceData.updatedAt
                };
                
                appState.workspaceList.push(newWorkspace);
                
                // Select the new workspace
                selectWorkspace(newWorkspace.id);
            } else {
                showNotification('Error creating workspace: ' + result.error, 'error');
            }
        })
        .catch(err => {
            showNotification('Error creating workspace: ' + err.message, 'error');
        });
}

// Select a workspace and load its content
function selectWorkspace(workspaceId) {
    console.log('Selecting workspace:', workspaceId);
    // Find the workspace in the list
    const workspace = appState.workspaceList.find(w => w.id === workspaceId);
    if (!workspace) {
        showNotification('Workspace not found', 'error');
        return;
    }
    
    // Set as current workspace
    appState.currentWorkspace = workspace;
    
    // Save to localStorage for persistence
    if (!window.foundryAPI) {
        localStorage.setItem('foundry_current_workspace', JSON.stringify(workspace));
    }
    
    // Hide workspace selection screen
    const workspaceScreen = document.getElementById('workspace-selection');
    if (workspaceScreen) {
        workspaceScreen.style.display = 'none';
    }
    
    // Show main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Update UI to reflect current workspace
    const titleEl = document.querySelector('.foundry-title');
    if (titleEl) {
        titleEl.textContent = workspace.name;
    }
    
    // Load workspace content
    loadWorkspaceContent(workspaceId);
    
    // Keep sidebar collapsed as per default behavior
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
}

// Load content for the selected workspace
function loadWorkspaceContent(workspaceId) {
    // Load documents and databases for this workspace
    loadDocumentList(workspaceId);
    loadDatabaseList(workspaceId);
    
    // Setup autosave if enabled
    setupAutoSave();
}

// Load user settings from localStorage
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('foundry_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            appState.settings = { ...appState.settings, ...settings };
            
            // Apply dark mode if enabled
            if (appState.settings.darkMode) {
                document.documentElement.classList.add('dark-mode');
            }
        } else {
            // Default to system preference for dark mode
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                appState.settings.darkMode = true;
                document.documentElement.classList.add('dark-mode');
            }
        }

        // Load current workspace if available
        const savedWorkspace = localStorage.getItem('foundry_current_workspace');
        if (savedWorkspace) {
            try {
                appState.currentWorkspace = JSON.parse(savedWorkspace);
            } catch (e) {
                console.error('Error parsing saved workspace:', e);
            }
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

// Setup autosave functionality
function setupAutoSave() {
    // Clear any existing timer
    if (appState.autoSaveTimer) {
        clearInterval(appState.autoSaveTimer);
        appState.autoSaveTimer = null;
    }
    
    // Set up new timer if enabled
    if (appState.settings.autoSave) {
        const interval = Math.max(10000, appState.settings.autoSaveInterval * 1000);
        appState.autoSaveTimer = setInterval(() => {
            if (appState.currentDocument) {
                saveCurrentDocument(true); // True means silent save (no notification)
            }
        }, interval);
    }
}

// Initialize UI components
function initializeUI() {
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Initialize sidebar state - always start collapsed
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Sidebar toggle (in toolbar)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    });
    
    // Fixed sidebar toggle (side of screen)
    document.getElementById('sidebar-toggle-fixed')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            
            // Update icon based on sidebar state
            const iconElement = document.querySelector('#sidebar-toggle-fixed i');
            if (iconElement) {
                if (sidebar.classList.contains('open')) {
                    iconElement.setAttribute('data-lucide', 'chevron-left');
                } else {
                    iconElement.setAttribute('data-lucide', 'chevron-right');
                }
                lucide.createIcons();
            }
        }
    });
    
    document.getElementById('sidebar-close')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    });
    
    // Document operations
    document.getElementById('save-document')?.addEventListener('click', () => {
        saveCurrentDocument();
    });
    
    // New Page button in sidebar
    document.getElementById('new-page-btn')?.addEventListener('click', () => {
        createNewDocument();
    });
    
    // Workspace switcher button
    document.getElementById('workspace-switcher')?.addEventListener('click', () => {
        showWorkspaceSelection();
    });
    
    // Share and Settings buttons
    document.querySelector('.toolbar button:nth-child(1)')?.addEventListener('click', showShareDialog);
    document.querySelector('.toolbar button:nth-child(2)')?.addEventListener('click', showSettingsDialog);
    
    // Export button
    document.getElementById('export-button')?.addEventListener('click', exportCurrentDocument);
    
    // Block menu
    document.getElementById('block-menu')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('block-menu')) {
            hideBlockMenu();
        }
    });
    
    // Add delete functionality to block option buttons
    document.querySelectorAll('.block-options button:last-child').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const block = e.target.closest('.block-container');
            if (block && confirm('Delete this block?')) {
                block.remove();
            }
        });
    });
}

// Document Management Functions
function loadDocumentList(workspaceId) {
    if (!workspaceId && appState.currentWorkspace) {
        workspaceId = appState.currentWorkspace.id;
    }
    
    if (!workspaceId) {
        console.error('No workspace ID provided to load documents');
        return;
    }
    
    if (!window.foundryAPI) {
        console.log('foundryAPI not available, using local storage fallback');
        // Use localStorage as fallback when not running in Electron
        try {
            const savedList = localStorage.getItem(`foundry_document_list_${workspaceId}`);
            if (savedList) {
                appState.documentList = JSON.parse(savedList);
                renderDocumentList();
            } else {
                appState.documentList = [];
                renderDocumentList();
            }
        } catch (err) {
            console.error('Error loading document list from localStorage:', err);
        }
        return;
    }
    
    // Use Electron API to list documents
    window.foundryAPI.listDocuments(workspaceId)
        .then(result => {
            if (result.success) {
                appState.documentList = result.documents;
                renderDocumentList();
            } else {
                console.error('Error loading document list:', result.error);
            }
        })
        .catch(err => {
            console.error('Error loading document list:', err);
        });
}

function renderDocumentList() {
    const pagesList = document.getElementById('pages-list');
    if (!pagesList) return;
    
    // Clear existing list
    pagesList.innerHTML = '';
    
    // Add each document to the list
    appState.documentList.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <a href="#" class="flex items-center flex-grow" data-doc-id="${doc.id}">
                    <i data-lucide="file-text" class="w-4 h-4 mr-2"></i>
                    <span>${doc.title}</span>
                </a>
                <button class="delete-doc-btn text-gray-400 hover:text-red-500" data-doc-id="${doc.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        // Add click handler to load document
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            loadDocument(doc.id);
        });
        
        // Add delete handler
        li.querySelector('.delete-doc-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteDocument(doc.id);
        });
        
        pagesList.appendChild(li);
    });
    
    // If no documents, add a hint
    if (appState.documentList.length === 0) {
        const li = document.createElement('li');
        li.innerHTML = `
            <p class="text-sm text-gray-500 p-2">No documents yet. Click "New Page" to create one.</p>
        `;
        pagesList.appendChild(li);
    }
    
    // Re-initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

function loadDocument(docId) {
    if (!appState.currentWorkspace) {
        showNotification('No workspace selected', 'error');
        return;
    }
    
    const workspaceId = appState.currentWorkspace.id;
    
    if (!window.foundryAPI) {
        console.log('foundryAPI not available, using local storage fallback');
        // Use localStorage as fallback when not running in Electron
        try {
            const savedDoc = localStorage.getItem(`foundry_document_${workspaceId}_${docId}`);
            if (savedDoc) {
                renderDocument(JSON.parse(savedDoc));
            }
        } catch (err) {
            console.error('Error loading document from localStorage:', err);
        }
        return;
    }
    
    // Use Electron API to load document
    window.foundryAPI.loadDocument(workspaceId, docId)
        .then(result => {
            if (result.success) {
                renderDocument(result.document);
            } else {
                console.error('Error loading document:', result.error);
                showNotification('Error loading document: ' + result.error, 'error');
            }
        })
        .catch(err => {
            console.error('Error loading document:', err);
            showNotification('Error loading document: ' + err.message, 'error');
        });
}

function renderDocument(doc) {
    // Store the current document in state
    appState.currentDocument = doc;
    
    // Set the document title
    document.getElementById('document-title').value = doc.title;
    
    // Clear the editor
    const editor = document.getElementById('editor');
    editor.innerHTML = '';
    
    // Render each block
    if (doc.blocks && Array.isArray(doc.blocks)) {
        doc.blocks.forEach(block => {
            const blockElement = createBlockElement(block.type, block.content);
            
            // Set ID to match saved ID if available
            if (block.id) {
                blockElement.id = block.id;
            }
            
            // Handle special block types
            if (block.type === 'todo' && block.checked) {
                const checkbox = blockElement.querySelector('.todo-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    blockElement.querySelector('.todo-text').classList.add('line-through');
                }
            }
            
            editor.appendChild(blockElement);
        });
    }
    
    // Highlight the selected document in the sidebar
    const links = document.querySelectorAll('#pages-list a');
    links.forEach(link => {
        if (link.getAttribute('data-doc-id') === doc.id) {
            link.classList.add('bg-blue-50', 'text-blue-700');
        } else {
            link.classList.remove('bg-blue-50', 'text-blue-700');
        }
    });
    
    showNotification('Document loaded successfully');
    
    // Hide sidebar on mobile after selecting a document
    if (window.innerWidth < 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
}

function saveCurrentDocument(silent = false) {
    if (!appState.currentWorkspace) {
        showNotification('No workspace selected', 'error');
        return;
    }
    
    const workspaceId = appState.currentWorkspace.id;
    
    // Collect all blocks from the editor
    const blocks = Array.from(document.getElementById('editor').children).map(block => {
        const blockId = block.id;
        const blockType = block.classList.contains('todo-block-container') ? 'todo' :
                         block.querySelector('.heading-block') ? 'heading' :
                         block.querySelector('.list-block') ? 'list' :
                         block.querySelector('.quote-block') ? 'quote' :
                         block.querySelector('.code-block') ? 'code' :
                         'text';
        
        let content = '';
        let additionalData = {};
        
        if (blockType === 'todo') {
            content = block.querySelector('.todo-text').textContent;
            additionalData.checked = block.querySelector('.todo-checkbox').checked;
        } else if (blockType === 'code') {
            content = block.querySelector('.code-block').textContent;
            const languageSelector = block.querySelector('select');
            if (languageSelector) {
                additionalData.language = languageSelector.value;
            }
        } else {
            const editable = block.querySelector('.editable-block');
            if (editable) content = editable.textContent;
        }
        
        return { 
            id: blockId, 
            type: blockType, 
            content,
            ...additionalData
        };
    });
    
    const docTitle = document.getElementById('document-title').value;
    
    const documentData = {
        id: appState.currentDocument?.id || Date.now().toString(),
        workspaceId: workspaceId,
        title: docTitle || 'Untitled',
        blocks,
        updatedAt: new Date().toISOString(),
        createdAt: appState.currentDocument?.createdAt || new Date().toISOString()
    };
    
    if (!window.foundryAPI) {
        // Fallback for when running without Electron
        console.log('Document data (would be saved):', documentData);
        localStorage.setItem(`foundry_document_${workspaceId}_${documentData.id}`, JSON.stringify(documentData));
        
        // Update document list in localStorage
        let docList = [];
        try {
            const savedList = localStorage.getItem(`foundry_document_list_${workspaceId}`);
            if (savedList) {
                docList = JSON.parse(savedList);
            }
        } catch (err) {
            console.error('Error parsing document list:', err);
        }
        
        // Update or add the document in the list
        const existingIndex = docList.findIndex(doc => doc.id === documentData.id);
        if (existingIndex >= 0) {
            docList[existingIndex] = {
                id: documentData.id,
                title: documentData.title,
                updatedAt: documentData.updatedAt,
                createdAt: documentData.createdAt
            };
        } else {
            docList.push({
                id: documentData.id,
                title: documentData.title,
                updatedAt: documentData.updatedAt,
                createdAt: documentData.createdAt
            });
        }
        
        localStorage.setItem(`foundry_document_list_${workspaceId}`, JSON.stringify(docList));
        appState.documentList = docList;
        renderDocumentList();
        
        if (!silent) {
            showNotification('Document saved to local storage');
        }
        return;
    }
    
    // Use Electron API to save document
    window.foundryAPI.saveDocument(documentData)
        .then(result => {
            if (result.success) {
                // Update the current document with any changes from the save
                appState.currentDocument = {
                    ...documentData,
                    id: result.id // Use the ID from the result in case it was newly created
                };
                
                if (!silent) {
                    showNotification('Document saved successfully!');
                }
                
                // Refresh the document list to show the new/updated document
                loadDocumentList(workspaceId);
            } else {
                showNotification('Error saving document: ' + result.error, 'error');
            }
        })
        .catch(err => {
            showNotification('Error saving document: ' + err.message, 'error');
        });
}

function createNewDocument() {
    if (!appState.currentWorkspace) {
        showNotification('Please select a workspace first', 'warning');
        return;
    }
    
    if (appState.currentDocument && !confirm('Create a new document? Unsaved changes will be lost.')) {
        return;
    }
    
    // Reset current document
    appState.currentDocument = null;
    
    // Clear the editor
    document.getElementById('document-title').value = 'Untitled';
    document.getElementById('editor').innerHTML = '';
    
    // Hide any open database views
    const dbView = document.getElementById('sample-database');
    if (dbView) dbView.style.display = 'none';
    
    // Add initial blocks to help users get started
    addBlock('heading', 'Start your document here');
    addBlock('text', 'Click to start typing...');
    
    showNotification('New document created');
}

function deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
        return;
    }
    
    if (!appState.currentWorkspace) {
        showNotification('No workspace selected', 'error');
        return;
    }
    
    const workspaceId = appState.currentWorkspace.id;
    
    if (!window.foundryAPI) {
        // Fallback for when running without Electron
        try {
            localStorage.removeItem(`foundry_document_${workspaceId}_${docId}`);
            
            // Update document list
            const savedList = localStorage.getItem(`foundry_document_list_${workspaceId}`);
            if (savedList) {
                const docList = JSON.parse(savedList).filter(doc => doc.id !== docId);
                localStorage.setItem(`foundry_document_list_${workspaceId}`, JSON.stringify(docList));
                appState.documentList = docList;
                renderDocumentList();
            }
            
            showNotification('Document deleted from local storage');
            
            // If the deleted document was the current one, create a new document
            if (appState.currentDocument?.id === docId) {
                createNewDocument();
            }
        } catch (err) {
            console.error('Error deleting document from localStorage:', err);
            showNotification('Error deleting document', 'error');
        }
        return;
    }
    
    // Use Electron API to delete document
    window.foundryAPI.deleteDocument(workspaceId, docId)
        .then(result => {
            if (result.success) {
                showNotification('Document deleted successfully');
                
                // Refresh the document list
                loadDocumentList(workspaceId);
                
                // If the deleted document was the current one, create a new document
                if (appState.currentDocument?.id === docId) {
                    createNewDocument();
                }
            } else {
                showNotification('Error deleting document: ' + result.error, 'error');
            }
        })
        .catch(err => {
            showNotification('Error deleting document: ' + err.message, 'error');
        });
}

// Database Management Functions
function loadDatabaseList(workspaceId) {
    if (!workspaceId && appState.currentWorkspace) {
        workspaceId = appState.currentWorkspace.id;
    }
    
    if (!workspaceId) {
        console.error('No workspace ID provided to load databases');
        return;
    }
    
    // This would use the Electron API to list databases for the workspace
    // For now, just use some sample data
    appState.databaseList = [
        { id: 'db1', name: 'Tasks', workspaceId: workspaceId },
        { id: 'db2', name: 'Projects', workspaceId: workspaceId }
    ];
    
    renderDatabaseList();
}

function renderDatabaseList() {
    const dbList = document.getElementById('databases-list');
    if (!dbList) return;
    
    // Clear existing list
    dbList.innerHTML = '';
    
    // Add each database to the list
    appState.databaseList.forEach(db => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" class="flex items-center p-2 rounded-md hover:bg-gray-100" data-db-id="${db.id}">
                <i data-lucide="database" class="w-4 h-4 mr-2"></i>
                <span>${db.name}</span>
            </a>
        `;
        
        // Add click handler to view database
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            viewDatabase(db.id);
        });
        
        dbList.appendChild(li);
    });
    
    // Add event listener for new database button
    document.getElementById('new-database-btn')?.addEventListener('click', createNewDatabase);
    
    // Re-initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

function viewDatabase(dbId) {
    // In a real app, this would query the database and display its contents
    // For demo purposes, just show the sample database view
    const sampleDB = document.getElementById('sample-database');
    if (sampleDB) {
        sampleDB.style.display = 'block';
    }
    
    // Highlight the selected database in the sidebar
    const links = document.querySelectorAll('#databases-list a');
    links.forEach(link => {
        if (link.getAttribute('data-db-id') === dbId) {
            link.classList.add('bg-blue-50', 'text-blue-700');
        } else {
            link.classList.remove('bg-blue-50', 'text-blue-700');
        }
    });
    
    // Hide sidebar on mobile after selecting a database
    if (window.innerWidth < 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
}

function createNewDatabase() {
    // In a real app, this would show a modal to configure the new database
    // For demo purposes, just log a message
    console.log('Creating new database...');
    
    // Mock implementation
    const dbName = prompt('Enter a name for the new database:');
    if (!dbName) return;
    
    const dbConfig = {
        name: dbName,
        schema: {
            fields: [
                { name: 'name', type: 'text' },
                { name: 'status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
                { name: 'assignee', type: 'text' },
                { name: 'dueDate', type: 'date' }
            ]
        },
        entries: []
    };
    
    if (!window.foundryAPI) {
        // Fallback for when running without Electron
        console.log('Database config (would be created):', dbConfig);
        showNotification('Database created (simulated)');
        
        // Add to the local list and refresh UI
        const newDb = { id: 'db_' + Date.now(), name: dbName };
        appState.databaseList.push(newDb);
        renderDatabaseList();
        return;
    }
    
    // Use Electron API to create database
    window.foundryAPI.createDatabase(dbConfig)
        .then(result => {
            if (result.success) {
                showNotification('Database created successfully!');
                
                // Add to the local list and refresh UI
                appState.databaseList.push({
                    id: result.id,
                    name: dbName
                });
                renderDatabaseList();
                
                // View the new database
                viewDatabase(result.id);
            } else {
                showNotification('Error creating database: ' + result.error, 'error');
            }
        })
        .catch(err => {
            showNotification('Error creating database: ' + err.message, 'error');
        });
}

// Block menu functions
function showBlockMenu() {
    const blockMenu = document.getElementById('block-menu');
    if (blockMenu) {
        blockMenu.classList.remove('hidden');
    }
}

function hideBlockMenu() {
    const blockMenu = document.getElementById('block-menu');
    if (blockMenu) {
        blockMenu.classList.add('hidden');
    }
}

function addDatabaseBlock() {
    // Add a database reference block to the editor
    const newBlock = createBlockElement('database', 'Tasks');
    document.getElementById('editor').appendChild(newBlock);
    
    // Show the sample database
    const sampleDB = document.getElementById('sample-database');
    if (sampleDB) {
        sampleDB.style.display = 'block';
    }
}

// Utility Functions
function showNotification(message, type = 'success', duration = 3000) {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed bottom-4 right-4 flex flex-col items-end space-y-2 z-50';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `px-6 py-3 rounded-md shadow-lg flex items-center ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'warning' ? 'bg-yellow-500 text-white' : 
        'bg-blue-500 text-white'
    } transition-all duration-300 transform translate-x-0 scale-100`;
    
    // Add icon based on notification type
    let icon = '';
    switch (type) {
        case 'success':
            icon = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>`;
            break;
        case 'error':
            icon = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>`;
            break;
        case 'warning':
            icon = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>`;
            break;
        default:
            icon = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
    }
    
    notification.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('scale-in');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => {
            notificationContainer.removeChild(notification);
            
            // Remove container if empty
            if (notificationContainer.children.length === 0) {
                document.body.removeChild(notificationContainer);
            }
        }, 300);
    }, duration);
}

// Responsive behavior
window.addEventListener('resize', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth >= 768) {
        sidebar.classList.add('open');
    } else if (sidebar && window.innerWidth < 768) {
        sidebar.classList.remove('open');
    }
});

// Export functions for global access
window.showBlockMenu = showBlockMenu;
window.hideBlockMenu = hideBlockMenu;
window.addDatabaseBlock = addDatabaseBlock;

// Share and Settings Dialog Functions
function showShareDialog() {
    // Create modal for share options
    const modalHTML = `
    <div id="share-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Share Document</h3>
                <button id="close-share-modal" class="p-1 rounded hover:bg-gray-100">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Link to this document</label>
                    <div class="flex">
                        <input type="text" value="foundry://${appState.currentDocument?.id || 'document'}" 
                               class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" readonly>
                        <button id="copy-link-btn" class="px-3 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200">
                            Copy
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Share with others</label>
                    <div class="flex">
                        <input type="email" placeholder="Enter email address" 
                               class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <button class="px-3 py-2 bg-blue-600 text-white border border-blue-600 rounded-r-md hover:bg-blue-700">
                            Send
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Access permissions</label>
                    <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="view">Can view</option>
                        <option value="comment">Can comment</option>
                        <option value="edit">Can edit</option>
                    </select>
                </div>
                
                <div class="pt-3 flex justify-end">
                    <button id="share-submit-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Share
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Add event listeners
    document.getElementById('close-share-modal').addEventListener('click', () => {
        document.getElementById('share-modal').remove();
    });
    
    document.getElementById('copy-link-btn').addEventListener('click', (e) => {
        const linkInput = e.target.previousElementSibling;
        linkInput.select();
        document.execCommand('copy');
        showNotification('Link copied to clipboard');
    });
    
    document.getElementById('share-submit-btn').addEventListener('click', () => {
        // In a real app, this would submit the share request to the backend
        showNotification('Share settings updated');
        document.getElementById('share-modal').remove();
    });
}

function showSettingsDialog() {
    // Create modal for settings
    const modalHTML = `
    <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Settings</h3>
                <button id="close-settings-modal" class="p-1 rounded hover:bg-gray-100">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-2">Appearance</h4>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600">Dark Mode</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="dark-mode-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-2">Editor</h4>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-600">Auto-save</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="autosave-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">Auto-save interval (seconds)</label>
                            <input type="number" id="autosave-interval" value="30" min="10" max="300"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-2">Data Storage</h4>
                    <button id="export-all-data" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 w-full text-left mb-2">
                        Export all documents
                    </button>
                    <label for="import-file" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 w-full text-left cursor-pointer inline-block">
                        Import documents
                    </label>
                    <input type="file" id="import-file" accept=".json" class="hidden">
                </div>
                
                <div class="pt-3 flex justify-end">
                    <button id="settings-cancel-btn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2">
                        Cancel
                    </button>
                    <button id="settings-save-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Set initial state for dark mode toggle based on system preference
    if (appState.settings.darkMode) {
        document.getElementById('dark-mode-toggle').checked = true;
    }
    
    // Set initial state for autosave toggle and interval
    document.getElementById('autosave-toggle').checked = appState.settings.autoSave;
    document.getElementById('autosave-interval').value = appState.settings.autoSaveInterval;
    
    // Add event listeners
    document.getElementById('close-settings-modal').addEventListener('click', () => {
        document.getElementById('settings-modal').remove();
    });
    
    document.getElementById('settings-cancel-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').remove();
    });
    
    document.getElementById('settings-save-btn').addEventListener('click', () => {
        // In a real app, this would save the settings to the backend/local storage
        const darkMode = document.getElementById('dark-mode-toggle').checked;
        const autoSave = document.getElementById('autosave-toggle').checked;
        const autoSaveInterval = document.getElementById('autosave-interval').value;
        
        // Apply settings
        if (darkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
        
        // Update app state
        appState.settings.darkMode = darkMode;
        appState.settings.autoSave = autoSave;
        appState.settings.autoSaveInterval = parseInt(autoSaveInterval, 10);
        
        // Save settings to local storage for persistence
        localStorage.setItem('foundry_settings', JSON.stringify(appState.settings));
        
        // Update autosave functionality
        setupAutoSave();
        
        showNotification('Settings saved');
        document.getElementById('settings-modal').remove();
    });
    
    document.getElementById('export-all-data').addEventListener('click', () => {
        exportAllDocuments();
    });
    
    document.getElementById('import-file').addEventListener('change', (e) => {
        importDocuments(e.target.files[0]);
    });
}

// Export all documents as JSON
function exportAllDocuments() {
    if (!window.foundryAPI && !appState.documentList.length) {
        showNotification('No documents to export', 'error');
        return;
    }
    
    // In browser mode, use localStorage data
    if (!window.foundryAPI) {
        const docs = [];
        appState.documentList.forEach(docMeta => {
            const docData = localStorage.getItem(`foundry_document_${docMeta.id}`);
            if (docData) {
                docs.push(JSON.parse(docData));
            }
        });
        
        // Create and download a JSON file
        const dataStr = JSON.stringify(docs, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'foundry_documents.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Documents exported successfully');
        return;
    }
    
    // When running in Electron, this would use the API to export documents
    showNotification('Feature not implemented in Electron mode yet', 'error');
}

// Import documents from JSON file
function importDocuments(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const documents = JSON.parse(e.target.result);
            
            if (!Array.isArray(documents)) {
                throw new Error('Invalid document format');
            }
            
            let importCount = 0;
            
            // Process each document
            documents.forEach(doc => {
                if (!doc.id || !doc.title || !doc.blocks) {
                    console.warn('Skipping invalid document:', doc);
                    return;
                }
                
                if (!window.foundryAPI) {
                    // In browser mode, save to localStorage
                    localStorage.setItem(`foundry_document_${doc.id}`, JSON.stringify(doc));
                    importCount++;
                } else {
                    // In Electron mode, use the API
                    window.foundryAPI.saveDocument(doc)
                        .then(result => {
                            if (result.success) {
                                importCount++;
                            }
                        })
                        .catch(err => {
                            console.error('Error importing document:', err);
                        });
                }
            });
            
            // Update document list with new documents
            if (!window.foundryAPI) {
                // Update document list in localStorage
                const docList = documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    updatedAt: doc.updatedAt,
                    createdAt: doc.createdAt
                }));
                
                // Merge with existing documents
                let existingList = [];
                try {
                    const savedList = localStorage.getItem('foundry_document_list');
                    if (savedList) {
                        existingList = JSON.parse(savedList);
                    }
                } catch (err) {
                    console.error('Error parsing document list:', err);
                }
                
                // Combine lists, replacing existing entries with imported ones
                const combined = [...existingList];
                docList.forEach(newDoc => {
                    const existingIndex = combined.findIndex(doc => doc.id === newDoc.id);
                    if (existingIndex >= 0) {
                        combined[existingIndex] = newDoc;
                    } else {
                        combined.push(newDoc);
                    }
                });
                
                localStorage.setItem('foundry_document_list', JSON.stringify(combined));
                appState.documentList = combined;
                renderDocumentList();
            } else {
                // For Electron mode, refresh the document list
                loadDocumentList();
            }
            
            showNotification(`Imported ${importCount} documents successfully`);
        } catch (error) {
            console.error('Error importing documents:', error);
            showNotification('Error importing documents: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Export current document
function exportCurrentDocument() {
    if (!appState.currentDocument) {
        showNotification('No document to export', 'warning');
        return;
    }
    
    // Create and download a JSON file
    const dataStr = JSON.stringify(appState.currentDocument, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const fileName = appState.currentDocument.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
    
    showNotification('Document exported successfully');
}

// Create block element with content
function createBlockElement(type, content = '') {
    const blockId = 'block-' + Date.now().toString();
    const blockContainer = document.createElement('div');
    blockContainer.className = 'block-container relative mb-4';
    blockContainer.id = blockId;
    
    let blockHtml = '';
    
    switch (type) {
        case 'heading':
            blockHtml = `
                <div class="heading-block text-2xl font-bold mb-2">
                    <div class="editable-block outline-none" contenteditable="true">${content}</div>
                </div>
                <div class="block-options hidden absolute right-0 top-0 flex space-x-1">
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-up"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-down"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            break;
        case 'text':
            blockHtml = `
                <div class="text-block">
                    <div class="editable-block outline-none" contenteditable="true">${content}</div>
                </div>
                <div class="block-options hidden absolute right-0 top-0 flex space-x-1">
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-up"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-down"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            break;
        case 'todo':
            blockHtml = `
                <div class="todo-block-container flex items-start">
                    <input type="checkbox" class="todo-checkbox mt-1 mr-2">
                    <div class="todo-text editable-block outline-none flex-grow" contenteditable="true">${content}</div>
                </div>
                <div class="block-options hidden absolute right-0 top-0 flex space-x-1">
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-up"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-down"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            break;
        case 'database':
            blockHtml = `
                <div class="database-block border rounded-md p-2 bg-gray-50">
                    <div class="flex items-center">
                        <i data-lucide="database" class="mr-2"></i>
                        <span class="font-medium">${content} Database</span>
                    </div>
                    <div class="text-sm text-gray-500 mt-1">Click to view data</div>
                </div>
                <div class="block-options hidden absolute right-0 top-0 flex space-x-1">
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-up"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-down"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            break;
        default:
            blockHtml = `
                <div class="text-block">
                    <div class="editable-block outline-none" contenteditable="true">${content}</div>
                </div>
                <div class="block-options hidden absolute right-0 top-0 flex space-x-1">
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-up"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="arrow-down"></i></button>
                    <button class="p-1 rounded hover:bg-gray-100"><i data-lucide="trash-2"></i></button>
                </div>
            `;
    }
    
    blockContainer.innerHTML = blockHtml;
    
    // Add event listeners for block options
    blockContainer.addEventListener('mouseenter', () => {
        blockContainer.querySelector('.block-options').classList.remove('hidden');
    });
    
    blockContainer.addEventListener('mouseleave', () => {
        blockContainer.querySelector('.block-options').classList.add('hidden');
    });
    
    // Add event listener for todo checkboxes
    if (type === 'todo') {
        const checkbox = blockContainer.querySelector('.todo-checkbox');
        const todoText = blockContainer.querySelector('.todo-text');
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                todoText.classList.add('line-through');
            } else {
                todoText.classList.remove('line-through');
            }
        });
    }
    
    // If database block, add click handler to show the database
    if (type === 'database') {
        blockContainer.querySelector('.database-block').addEventListener('click', () => {
            addDatabaseBlock();
        });
    }
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons({
            icons: blockContainer.querySelectorAll('[data-lucide]')
        });
    }
    
    return blockContainer;
}

// Add a new block to the editor
function addBlock(type, content = '') {
    const editor = document.getElementById('editor');
    const newBlock = createBlockElement(type, content);
    editor.appendChild(newBlock);
    
    // Focus on the new block if it's editable
    const editableBlock = newBlock.querySelector('.editable-block');
    if (editableBlock) {
        editableBlock.focus();
        
        // Place cursor at the end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editableBlock);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    return newBlock;
} 