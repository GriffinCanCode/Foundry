/**
 * document.js - Document operations and management
 */

import { appState } from '../core/app-core.js';
import { renderDocumentList } from './ui.js';
import { showNotification } from '../utils/notifications.js';
import { createBlockElement } from './blocks.js';
import { 
  initializeDocumentStorage,
  saveDocument, 
  loadDocument as loadDocumentFromStorage,
  deleteDocument as deleteDocumentFromStorage, 
  listDocuments as listDocumentsFromStorage,
  exportDocuments as exportDocumentsToFile,
  importDocuments as importDocumentsFromFile,
  searchDocuments
} from '../storage/document-storage.js';

// Initialize document storage when module is imported
initializeDocumentStorage().catch(error => {
  console.error('Failed to initialize document storage:', error);
});

// Create a new document
export function createNewDocument() {
    // Generate unique ID (in production, this would be from the server)
    const docId = 'doc_' + Date.now();
    
    // Create document object
    const newDoc = {
        id: docId,
        title: 'Untitled',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        content: [],
        workspaceId: appState.currentWorkspace?.id
    };
    
    // Save to storage
    saveDocument(newDoc)
        .then(result => {
            // Add to app state
            appState.documentList.push(newDoc);
            
            // Set as current document
            appState.currentDocument = newDoc;
            
            // Update UI
            renderDocumentList();
            renderDocument(newDoc);
            
            showNotification('New document created', 'success');
        })
        .catch(error => {
            console.error('Error creating document:', error);
            showNotification('Failed to create document', 'error');
        });
}

// Load a document by ID
export function loadDocument(id) {
    // Attempt to load from storage
    loadDocumentFromStorage(id)
        .then(document => {
            // Set as current document
            appState.currentDocument = document;
            
            // Render the document contents
            renderDocument(document);
            
            // Update last accessed timestamp
            document.lastAccessed = new Date().toISOString();
            saveDocument(document, { silent: true });
        })
        .catch(error => {
            console.error('Error loading document:', error);
            showNotification('Document not found', 'error');
        });
}

// Render document content in the editor
export function renderDocument(document) {
    // Get editor element
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    // Clear the editor
    editor.innerHTML = '';
    
    // Set document title
    const titleElement = document.getElementById('document-title');
    if (titleElement) {
        titleElement.textContent = document.title;
        
        // Add event listener for title changes
        titleElement.addEventListener('input', () => {
            if (appState.currentDocument) {
                appState.currentDocument.title = titleElement.textContent;
            }
        });
    }
    
    // If document has content, render it
    if (document.content && document.content.length > 0) {
        document.content.forEach(block => {
            const blockElement = createBlockElement(block.type, block.content);
            editor.appendChild(blockElement);
            
            // If block has additional properties, apply them
            if (block.type === 'todo' && block.checked) {
                const checkbox = blockElement.querySelector('.todo-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    blockElement.querySelector('.todo-text').classList.add('line-through');
                }
            }
        });
    } else {
        // If document is empty, add a default text block
        const blockElement = createBlockElement('text', '');
        editor.appendChild(blockElement);
        
        // Focus the block
        const editable = blockElement.querySelector('[contenteditable=true]');
        if (editable) {
            setTimeout(() => editable.focus(), 0);
        }
    }
}

// Save current document
export function saveCurrentDocument(silent = false) {
    // Check if there's a current document
    if (!appState.currentDocument) {
        if (!silent) showNotification('No document to save', 'error');
        return;
    }
    
    // Get content from editor
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    // Get document title
    const title = document.getElementById('document-title')?.textContent || 'Untitled';
    
    // Collect content from editor blocks
    const content = [];
    editor.querySelectorAll('.block-container').forEach(block => {
        // Determine block type
        const type = block.classList.contains('todo-block-container') ? 'todo' :
                  block.querySelector('.heading-block') ? 'heading' :
                  block.querySelector('.list-block') ? 'list' :
                  block.querySelector('.quote-block') ? 'quote' :
                  block.querySelector('.code-block') ? 'code' :
                  block.querySelector('.database-block-container') ? 'database' : 'text';
        
        // Get content based on type
        let blockContent = '';
        let additionalProps = {};
        
        if (type === 'todo') {
            blockContent = block.querySelector('.todo-text')?.textContent || '';
            additionalProps.checked = block.querySelector('.todo-checkbox')?.checked || false;
        } else if (type === 'database') {
            blockContent = block.querySelector('h3')?.textContent || 'Database';
        } else {
            const editable = block.querySelector('.editable-block');
            if (editable) blockContent = editable.textContent || '';
        }
        
        // Push block data to content array
        content.push({
            type,
            content: blockContent,
            ...additionalProps
        });
    });
    
    // Update document properties
    appState.currentDocument.title = title;
    appState.currentDocument.content = content;
    appState.currentDocument.updated = new Date().toISOString();
    
    // Save document to storage
    saveDocument(appState.currentDocument, { silent })
        .then(result => {
            if (!silent) showNotification('Document saved', 'success');
        })
        .catch(error => {
            console.error('Error saving document:', error);
            if (!silent) showNotification('Failed to save document', 'error');
        });
}

// Delete a document by ID
export function deleteDocument(id) {
    // Confirm deletion
    const confirm = window.confirm('Are you sure you want to delete this document?');
    if (!confirm) return;
    
    // Delete from storage
    deleteDocumentFromStorage(id)
        .then(result => {
            // If deleting the current document, clear current document
            if (appState.currentDocument && appState.currentDocument.id === id) {
                appState.currentDocument = null;
                
                // Clear editor
                const editor = document.getElementById('editor');
                if (editor) editor.innerHTML = '';
                
                // Clear title
                const titleElement = document.getElementById('document-title');
                if (titleElement) titleElement.textContent = '';
            }
            
            // Remove from app state
            const index = appState.documentList.findIndex(doc => doc.id === id);
            if (index !== -1) {
                appState.documentList.splice(index, 1);
            }
            
            // Update UI
            renderDocumentList();
            
            showNotification('Document deleted', 'success');
        })
        .catch(error => {
            console.error('Error deleting document:', error);
            showNotification('Failed to delete document', 'error');
        });
}

// Export current document
export function exportCurrentDocument() {
    // Check if there's a current document
    if (!appState.currentDocument) {
        showNotification('No document to export', 'error');
        return;
    }
    
    // Save document first to ensure latest content
    saveCurrentDocument(true);
    
    // Export document
    exportDocumentsToFile(appState.currentDocument.id)
        .then(() => {
            showNotification('Document exported', 'success');
        })
        .catch(error => {
            console.error('Error exporting document:', error);
            showNotification('Failed to export document', 'error');
        });
}

// Export all documents
export function exportAllDocuments() {
    // Check if there are documents
    if (appState.documentList.length === 0) {
        showNotification('No documents to export', 'error');
        return;
    }
    
    // Get all document IDs
    const documentIds = appState.documentList.map(doc => doc.id);
    
    // Export all documents
    exportDocumentsToFile(documentIds)
        .then(() => {
            showNotification('All documents exported', 'success');
        })
        .catch(error => {
            console.error('Error exporting documents:', error);
            showNotification('Failed to export documents', 'error');
        });
}

// Import documents
export function importDocuments(file) {
    if (!file) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                _importDocumentsFromFile(e.target.files[0]);
            }
        };
        
        input.click();
    } else {
        _importDocumentsFromFile(file);
    }
}

// Helper for importing documents
function _importDocumentsFromFile(file) {
    importDocumentsFromFile(file)
        .then(importedIds => {
            // Refresh document list
            loadDocumentList();
            
            showNotification(`Imported ${importedIds.length} document(s)`, 'success');
        })
        .catch(error => {
            console.error('Error importing documents:', error);
            showNotification('Failed to import documents: ' + error.message, 'error');
        });
}

// Load document list from storage
export function loadDocumentList() {
    listDocumentsFromStorage({ workspaceId: appState.currentWorkspace?.id })
        .then(documents => {
            appState.documentList = documents;
            renderDocumentList();
        })
        .catch(error => {
            console.error('Error loading document list:', error);
            showNotification('Failed to load documents', 'error');
        });
}

// Search for documents
export function searchDocumentsByContent(query) {
    return searchDocuments(query);
}

// Deprecated: Old function to save document list to localStorage
// Kept for backward compatibility, will be removed in future versions
function saveDocumentList() {
    console.warn('saveDocumentList is deprecated, documents are saved individually now');
    
    // Save each document in the list
    if (appState.documentList && appState.documentList.length > 0) {
        appState.documentList.forEach(doc => {
            saveDocument(doc, { silent: true }).catch(err => {
                console.error('Error saving document during list save:', err);
            });
        });
    }
} 