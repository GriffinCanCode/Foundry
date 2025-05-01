/**
 * document.js - Document operations and management
 */

import { appState } from '../core/app-core.js';
import { renderDocumentList } from './ui.js';
import { showNotification } from '../utils/notifications.js';
import { createBlockElement } from './blocks.js';

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
    
    // Add to app state
    appState.documentList.push(newDoc);
    
    // Save to local storage (in production, this would be to the server)
    saveDocumentList();
    
    // Set as current document
    appState.currentDocument = newDoc;
    
    // Update UI
    renderDocumentList();
    renderDocument(newDoc);
    
    showNotification('New document created', 'success');
}

// Load a document by ID
export function loadDocument(id) {
    // Find document in state
    const document = appState.documentList.find(doc => doc.id === id);
    if (!document) {
        showNotification('Document not found', 'error');
        return;
    }
    
    // Set as current document
    appState.currentDocument = document;
    
    // Render the document contents
    renderDocument(document);
    
    // Update last accessed timestamp
    document.lastAccessed = new Date().toISOString();
    saveDocumentList();
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
    
    // Save document list
    saveDocumentList();
    
    if (!silent) showNotification('Document saved', 'success');
}

// Delete a document by ID
export function deleteDocument(id) {
    // Find document index
    const index = appState.documentList.findIndex(doc => doc.id === id);
    if (index === -1) {
        showNotification('Document not found', 'error');
        return;
    }
    
    // Confirm deletion
    const confirm = window.confirm('Are you sure you want to delete this document?');
    if (!confirm) return;
    
    // Remove from app state
    appState.documentList.splice(index, 1);
    
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
    
    // Save document list
    saveDocumentList();
    
    // Update UI
    renderDocumentList();
    
    showNotification('Document deleted', 'success');
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
    
    // Create a blob from the document data
    const data = JSON.stringify(appState.currentDocument, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    
    // Create a download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${appState.currentDocument.title.replace(/\s+/g, '_')}.json`;
    
    // Append to document, trigger click, then remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('Document exported', 'success');
}

// Export all documents
export function exportAllDocuments() {
    // Check if there are documents
    if (appState.documentList.length === 0) {
        showNotification('No documents to export', 'error');
        return;
    }
    
    // Create a blob from all document data
    const data = JSON.stringify({
        documents: appState.documentList,
        workspace: appState.currentWorkspace,
        exportDate: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    
    // Create a download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `foundry_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    // Append to document, trigger click, then remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('All documents exported', 'success');
}

// Import documents from a file
export function importDocuments(file) {
    if (!file) {
        showNotification('No file selected', 'error');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Check if data has documents
            if (!data.documents || !Array.isArray(data.documents)) {
                showNotification('Invalid import file format', 'error');
                return;
            }
            
            // Add unique documents to app state
            let addedCount = 0;
            data.documents.forEach(doc => {
                // Skip if document already exists
                if (appState.documentList.some(d => d.id === doc.id)) return;
                
                // Add to app state
                appState.documentList.push(doc);
                addedCount++;
            });
            
            // Save document list
            saveDocumentList();
            
            // Update UI
            renderDocumentList();
            
            showNotification(`Imported ${addedCount} documents`, 'success');
        } catch (err) {
            console.error('Error importing documents:', err);
            showNotification('Failed to import documents', 'error');
        }
    };
    reader.readAsText(file);
}

// Save document list to local storage
function saveDocumentList() {
    try {
        localStorage.setItem(
            `foundry_docs_${appState.currentWorkspace?.id || 'default'}`, 
            JSON.stringify(appState.documentList)
        );
    } catch (err) {
        console.error('Error saving documents:', err);
        showNotification('Failed to save documents', 'error', 3000);
    }
}

// Load document list from local storage
export function loadDocumentList() {
    try {
        const docs = localStorage.getItem(
            `foundry_docs_${appState.currentWorkspace?.id || 'default'}`
        );
        if (docs) {
            appState.documentList = JSON.parse(docs);
            renderDocumentList();
        } else {
            appState.documentList = [];
        }
    } catch (err) {
        console.error('Error loading documents:', err);
        appState.documentList = [];
    }
} 