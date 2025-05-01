/**
 * document.js - Document operations and management
 */

import { appState } from '../core/app-core.js';
import { renderDocumentList } from './ui.js';
import { showNotification } from '../utils/notifications.js';
import { 
    initializePageEditor, 
    getEditorContent, 
    createNewEmptyDocument 
} from './page-editor.js';
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
            
            // Get editor element and ensure it's initialized
            const editor = document.getElementById('editor');
            if (editor) {
                // Make sure page editor is initialized
                initializePageEditor(editor);
                
                // Create at least one empty block if none exists
                if (editor.children.length === 0) {
                    import('./blocks.js').then(blocksModule => {
                        const { addBlock } = blocksModule;
                        addBlock('text', '');
                    });
                }
            }
            
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
export function renderDocument(docData) {
    // Get editor element
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    // Set document title
    const titleElement = document.getElementById('document-title');
    if (titleElement) {
        titleElement.textContent = docData.title;
        
        // Add event listener for title changes
        titleElement.addEventListener('input', () => {
            if (appState.currentDocument) {
                appState.currentDocument.title = titleElement.textContent;
            }
        });
    }
    
    // Clear the editor and prepare the content
    editor.innerHTML = '';
    
    // Initialize the page editor
    initializePageEditor(editor);
    
    // If document has content, add it to the editor
    if (docData.content && docData.content.length > 0) {
        // Import blocks module dynamically to avoid circular dependencies
        import('./blocks.js').then(blocksModule => {
            const { createBlockElement } = blocksModule;
            
            docData.content.forEach(block => {
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
                
                // Add database ID if present
                if (block.type === 'database' && block.databaseId) {
                    blockElement.dataset.databaseId = block.databaseId;
                }
            });
        });
    } else {
        // If document is empty, create a new empty document with default block
        createNewEmptyDocument();
    }
}

// Save current document
export function saveCurrentDocument(silent = false) {
    // Check if there's a current document
    if (!appState.currentDocument) {
        // Check if we have content to save first
        const editor = document.getElementById('editor');
        const title = document.getElementById('document-title')?.textContent || 'Untitled';
        
        if (editor && editor.children.length > 0) {
            // We have content to save but no current document - create one
            const docId = 'doc_' + Date.now();
            
            // Create document object
            const newDoc = {
                id: docId,
                title: title,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                content: getEditorContent(),
                workspaceId: appState.currentWorkspace?.id
            };
            
            // Set as current document first to prevent further issues
            appState.currentDocument = newDoc;
            
            // Save to storage
            saveDocument(newDoc, { silent })
                .then(result => {
                    // Add to app state
                    appState.documentList.push(newDoc);
                    
                    // Update UI
                    renderDocumentList();
                    
                    if (!silent) showNotification('Document saved', 'success');
                })
                .catch(error => {
                    console.error('Error saving new document:', error);
                    if (!silent) showNotification('Failed to save document', 'error');
                });
                
            return;
        } else {
            // No content to save
            if (!silent) showNotification('No document to save', 'error');
            return;
        }
    }
    
    // Get document title
    const title = document.getElementById('document-title')?.textContent || 'Untitled';
    
    // Get content from editor using the page-editor module
    const content = getEditorContent();
    
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
    // Save current document first
    if (appState.currentDocument) {
        saveCurrentDocument(true);
    }
    
    // Export all documents
    exportDocumentsToFile()
        .then(() => {
            showNotification('All documents exported', 'success');
        })
        .catch(error => {
            console.error('Error exporting documents:', error);
            showNotification('Failed to export documents', 'error');
        });
}

// Import documents from file
export function importDocuments(file) {
    if (!file) {
        showNotification('No file selected', 'error');
        return;
    }
    
    _importDocumentsFromFile(file)
        .then(result => {
            showNotification(`Imported ${result.count} documents`, 'success');
            loadDocumentList();
        })
        .catch(error => {
            console.error('Error importing documents:', error);
            showNotification('Failed to import documents', 'error');
        });
}

// Private helper function for importing
function _importDocumentsFromFile(file) {
    return new Promise((resolve, reject) => {
        importDocumentsFromFile(file)
            .then(result => {
                resolve(result);
            })
            .catch(reject);
    });
}

// Load document list
export function loadDocumentList() {
    listDocumentsFromStorage()
        .then(documents => {
            appState.documentList = documents;
            renderDocumentList();
        })
        .catch(error => {
            console.error('Error loading document list:', error);
        });
}

// Search documents by content
export function searchDocumentsByContent(query) {
    return searchDocuments(query);
}

// Helper function to save document list
function saveDocumentList() {
    // This is a placeholder for potential future implementation
    // Currently documents are saved individually
} 