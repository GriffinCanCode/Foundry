/**
 * document.js - Document operations and management
 */

import { appState } from "../core/app-core.js";
import { renderDocumentList } from "./ui.js";
import { showNotification } from "../utils/notifications.js";
import {
  initializePageEditor,
  getEditorContent,
  createNewEmptyDocument,
} from "./page-editor.js";
import { createBlockElement } from "./blocks.js";
import {
  initializeDocumentStorage,
  saveDocument,
  loadDocument as loadDocumentFromStorage,
  deleteDocument as deleteDocumentFromStorage,
  listDocuments as listDocumentsFromStorage,
  exportDocuments as exportDocumentsToFile,
  importDocuments as importDocumentsFromFile,
  searchDocuments,
  repairDocumentData
} from "../storage/document-storage.js";

// Initialize document storage when module is imported
initializeDocumentStorage().catch((error) => {
  console.error("Failed to initialize document storage:", error);
});

// Re-export the repair function so it can be used by app-core.js
export { repairDocumentData };

// Create a new document
export function createNewDocument() {
  // Ensure we have a current workspace
  if (!appState.currentWorkspace) {
    console.error('[DOCUMENT] Cannot create new document - no current workspace');
    showNotification("Please select a workspace first", "error");
    return;
  }

  // Generate unique ID (in production, this would be from the server)
  const docId = "doc_" + Date.now();

  // Create document object
  const newDoc = {
    id: docId,
    title: "Untitled",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    content: [],
    workspaceId: appState.currentWorkspace.id,
    isDraft: true // Mark as draft so we know it's not saved yet
  };

  console.log('[DOCUMENT] Created new document with workspace:', newDoc.workspaceId);

  // Set as current document without saving to storage or adding to documentList
  appState.currentDocument = newDoc;

  // Render the document in the editor
  renderDocument(newDoc);

  // Get editor element and ensure it's initialized
  const editor = document.getElementById("editor");
  if (editor) {
    // Make sure page editor is initialized
    initializePageEditor(editor);

    // Create at least one empty block if none exists
    if (editor.children.length === 0) {
      import("./blocks.js").then((blocksModule) => {
        const { addBlock } = blocksModule;
        addBlock("text", "");
      });
    }
  }

  showNotification("New page created - click Save to store it", "info");
}

// Load a document by ID
export function loadDocument(id) {
  console.log("Loading document with ID:", id);
  
  // If this document is already the current document, just update the UI
  if (appState.currentDocument && appState.currentDocument.id === id) {
    console.log("Document is already loaded:", id);
    
    // Just update the last accessed timestamp
    appState.currentDocument.lastAccessed = new Date().toISOString();
    
    // Save it silently to update the timestamp
    saveDocument(appState.currentDocument, { silent: true })
      .then(() => {
        // Update the UI in case anything changed
        renderDocumentList();
      })
      .catch(err => {
        console.error("Error updating last accessed timestamp:", err);
      });
    
    return;
  }
  
  // First check if it's already in app state to avoid unnecessary storage operations
  const existingDoc = appState.documentList.find(doc => doc.id === id);
  
  if (existingDoc) {
    console.log("Document found in app state:", existingDoc.title);
    
    // Verify document belongs to current workspace
    if (existingDoc.workspaceId && appState.currentWorkspace && existingDoc.workspaceId !== appState.currentWorkspace.id) {
      console.warn(`[DOCUMENT] Document ${id} belongs to workspace ${existingDoc.workspaceId}, but current workspace is ${appState.currentWorkspace.id}`);
      showNotification("Document not available in current workspace", "warning");
      return;
    }
    
    // Set as current document
    appState.currentDocument = existingDoc;
    
    // Render the document contents
    renderDocument(existingDoc);
    
    // Update last accessed timestamp
    existingDoc.lastAccessed = new Date().toISOString();
    saveDocument(existingDoc, { silent: true });
    
    // Use our sync helper to ensure document is in the list and UI is updated
    syncDocumentWithList(existingDoc);
    
    return;
  }
  
  // Otherwise attempt to load from storage
  loadDocumentFromStorage(id)
    .then((document) => {
      console.log("Document loaded from storage:", document.title);
      
      // Verify document belongs to current workspace
      if (document.workspaceId && appState.currentWorkspace && document.workspaceId !== appState.currentWorkspace.id) {
        console.warn(`[DOCUMENT] Document ${id} belongs to workspace ${document.workspaceId}, but current workspace is ${appState.currentWorkspace.id}`);
        showNotification("Document not available in current workspace", "warning");
        return;
      }
      
      // Validate document content structure
      if (!document.content || !Array.isArray(document.content)) {
        console.warn('[DOCUMENT] Document loaded from storage has invalid content structure, initializing empty content array');
        document.content = [];
      }
      
      // Check for blocks with missing properties
      if (document.content.length > 0) {
        let hasInvalidBlocks = false;
        document.content = document.content.map(block => {
          if (!block || typeof block !== 'object') {
            hasInvalidBlocks = true;
            return {
              id: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              type: 'text',
              content: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return block;
        });
        
        if (hasInvalidBlocks) {
          console.warn('[DOCUMENT] Fixed invalid blocks in document content');
        }
      }
      
      // Set as current document
      appState.currentDocument = document;

      // Render the document contents
      renderDocument(document);

      // Update last accessed timestamp
      document.lastAccessed = new Date().toISOString();
      saveDocument(document, { silent: true });
      
      // Use our sync helper to ensure document is in the list and UI is updated
      syncDocumentWithList(document);
    })
    .catch((error) => {
      console.error("Error loading document:", error);
      showNotification("Document not found", "error");
    });
}

// Helper function to sync document changes with the document list
function syncDocumentWithList(document) {
  console.log('[DOCUMENT] Syncing document with document list', document.id);
  if (!document) return;
  
  // Verify document belongs to current workspace
  if (appState.currentWorkspace && document.workspaceId !== appState.currentWorkspace.id) {
    console.warn(`[DOCUMENT] Cannot sync document ${document.id} - belongs to workspace ${document.workspaceId}, but current workspace is ${appState.currentWorkspace.id}`);
    return;
  }
  
  // Ensure document has proper workspace association
  if (!document.workspaceId && appState.currentWorkspace) {
    document.workspaceId = appState.currentWorkspace.id;
    console.log(`[DOCUMENT] Added missing workspace ID to document: ${document.workspaceId}`);
  }
  
  // Find the document in the list
  const index = appState.documentList.findIndex(doc => doc.id === document.id);
  
  if (index !== -1) {
    // Check if there are actual changes to the document
    const currentDoc = appState.documentList[index];
    const hasChanges = currentDoc.title !== document.title || 
                       currentDoc.updated !== document.updated ||
                       JSON.stringify(currentDoc.content) !== JSON.stringify(document.content);
    
    if (hasChanges) {
      console.log('[DOCUMENT] Document has changed, updating in document list:', 
                  'Old title:', currentDoc.title, 
                  'New title:', document.title);
      
      // Create a new object to ensure reactivity in UI components
      appState.documentList[index] = { ...document };
      
      // Ensure changes are saved to storage system
      // This is especially important when changes come from outside saveCurrentDocument
      saveDocument(document, { silent: true })
        .then(() => console.log('[DOCUMENT] Document changes persisted to storage via sync'))
        .catch(err => console.error('[DOCUMENT] Failed to persist document changes to storage:', err));
    } else {
      console.log('[DOCUMENT] Document unchanged, skipping update in list');
    }
  } else {
    // Add the document to the list if it's not there
    console.log('[DOCUMENT] Document not found in list, adding it');
    appState.documentList.push({ ...document });
    
    // Ensure new document is saved to storage
    saveDocument(document, { silent: true })
      .then(() => console.log('[DOCUMENT] New document added to storage via sync'))
      .catch(err => console.error('[DOCUMENT] Failed to add document to storage:', err));
  }
  
  // Ensure renderDocumentList is called to update the sidebar
  renderDocumentList();
}

// Render document content in the editor
export function renderDocument(docData) {
  console.log('%c[DOCUMENT] renderDocument called', 'background: #047857; color: white; padding: 2px 4px; border-radius: 4px;', 
              'title:', docData.title, 
              'content blocks:', docData.content?.length || 0);
  
  // First validate the document data
  if (!docData) {
    console.error('[DOCUMENT] Cannot render null document data');
    return;
  }
  
  // Log the content structure for debugging
  if (docData.content && docData.content.length > 0) {
    console.log('[DOCUMENT] First block to render:', 
                'type:', docData.content[0].type,
                'content:', `"${docData.content[0].content?.substring(0, 30)}${docData.content[0].content?.length > 30 ? '...' : ''}"`,
                'length:', docData.content[0].content?.length);
  }
              
  // Get editor element
  const editor = document.getElementById("editor");
  if (!editor) {
    console.error('[DOCUMENT] Editor element not found - cannot render document');
    return;
  }

  // Set document title
  const titleElement = document.getElementById("document-title");
  if (titleElement) {
    titleElement.textContent = docData.title || "Untitled";

    // Remove any existing event listeners to prevent duplicates
    const newTitleElement = titleElement.cloneNode(true);
    titleElement.parentNode.replaceChild(newTitleElement, titleElement);

    // Make title editable
    newTitleElement.addEventListener("input", function () {
      this.dataset.empty = this.textContent.trim() === "";
    });
    
    newTitleElement.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.blur();
      }
    });
  }

  // Clear existing content
  editor.innerHTML = "";
  
  // Initialize the page editor
  initializePageEditor(editor);
  
  // Validate docData.content
  if (!docData.content || !Array.isArray(docData.content) || docData.content.length === 0) {
    console.warn('[DOCUMENT] Document has no content blocks, creating default block');
    const defaultBlock = createBlockElement("text", "");
    editor.appendChild(defaultBlock);
    return;
  }

  try {
    docData.content.forEach((block, index) => {
      // Validate block has required properties
      if (!block || typeof block !== 'object' || !block.type) {
        console.warn(`[DOCUMENT] Block ${index} is invalid:`, block);
        return; // Skip this block
      }
      
      try {
        // Validate block content is defined
        if (block.content === undefined || block.content === null) {
          console.warn(`[DOCUMENT] Block ${index} has undefined/null content, setting to empty string`);
          block.content = '';
        }
        
        console.log(`[DOCUMENT] Creating block ${index + 1}/${docData.content.length}, type: ${block.type}, content: "${block.content?.substring(0, 30)}${block.content?.length > 30 ? '...' : ''}", length: ${block.content?.length}`);
        const blockElement = createBlockElement(block.type, block.content);
        
        // Double check the content was applied correctly
        const editable = blockElement.querySelector('[contenteditable="true"]');
        if (editable && !editable.textContent && block.content) {
          console.warn(`[DOCUMENT] Content not properly set, forcing content on editable element: "${block.content}"`);
          editable.textContent = block.content;
        }
        
        editor.appendChild(blockElement);
      } catch (blockError) {
        console.error(`[DOCUMENT] Error creating block ${index}:`, blockError);
        // Create fallback text block if a block fails
        try {
          const fallbackBlock = createBlockElement("text", block.content || "");
          editor.appendChild(fallbackBlock);
        } catch (fallbackError) {
          console.error('[DOCUMENT] Even fallback block creation failed:', fallbackError);
        }
      }
    });
  } catch (e) {
    console.error('[DOCUMENT] Error rendering document content:', e);
    // Add an empty block if rendering fails completely
    try {
      console.warn('[DOCUMENT] Creating emergency block due to rendering failure');
      const emergencyBlock = createBlockElement("text", "");
      editor.appendChild(emergencyBlock);
      
      // Focus the emergency block to allow immediate typing
      setTimeout(() => {
        const editable = emergencyBlock.querySelector('[contenteditable="true"]');
        if (editable) editable.focus();
      }, 0);
      
    } catch (emergencyError) {
      console.error('[DOCUMENT] Emergency block creation failed:', emergencyError);
      // Last resort: create a basic element without the helper function
      const basicBlock = document.createElement('div');
      basicBlock.className = 'block-container text-block-container';
      basicBlock.innerHTML = '<p class="editable-block text-block" contenteditable="true">Emergency block</p>';
      editor.appendChild(basicBlock);
    }
  }
}

// Save current document
export function saveCurrentDocument(silent = false) {
  console.log('%c[DOCUMENT] saveCurrentDocument called', 'background: #0369a1; color: white; padding: 2px 4px; border-radius: 4px;', 'silent:', silent);
  
  // Return a Promise for proper chaining
  return new Promise((resolve, reject) => {
    // Check if there's a current document
    if (!appState.currentDocument) {
      console.log('[DOCUMENT] No current document found');
      // Check if we have content to save first
      const editor = document.getElementById("editor");
      const title =
        document.getElementById("document-title")?.textContent || "Untitled";

      if (editor && editor.children.length > 0) {
        console.log('[DOCUMENT] Creating new document with title:', title);
        // We have content to save but no current document - create one
        const docId = "doc_" + Date.now();

        // Create document object
        const newDoc = {
          id: docId,
          title: title,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          content: getEditorContent(),
          workspaceId: appState.currentWorkspace?.id || "default",
          lastAccessed: new Date().toISOString(),
        };

        // Set as current document first to prevent further issues
        appState.currentDocument = newDoc;

        // Save to storage
        saveDocument(newDoc, { silent })
          .then((result) => {
            console.log('[DOCUMENT] New document saved to storage');
            // Add to app state
            appState.documentList.push(newDoc);

            // Update UI
            renderDocumentList();

            if (!silent) showNotification("Document saved", "success");
            resolve(result);
          })
          .catch((error) => {
            console.error("Error saving new document:", error);
            if (!silent) showNotification("Failed to save document", "error");
            reject(error);
          });
      } else {
        // No document to save
        console.log('[DOCUMENT] No content to save');
        resolve({ success: true, message: "No content to save" });
      }
      return;
    }

    // Save existing document

    // Get document title
    const title = document.getElementById("document-title")?.textContent || "Untitled";
    
    console.log('[DOCUMENT] Saving document:', appState.currentDocument.id, 'with title:', title);
    
    // Check if document is a draft (missing ID or has draft flag)
    const isDraft = appState.currentDocument.isDraft === true || 
                   !appState.currentDocument.id.includes("doc_");
                   
    if (isDraft) {
      // Update ID to a proper document ID if needed
      if (!appState.currentDocument.id.includes("doc_")) {
        appState.currentDocument.id = "doc_" + Date.now();
      }
      
      // Remove draft status
      delete appState.currentDocument.isDraft;
      console.log('[DOCUMENT] Draft status removed');
    }

    // Update document properties
    appState.currentDocument.title = title;
    appState.currentDocument.updated = new Date().toISOString();
    appState.currentDocument.lastAccessed = new Date().toISOString();
    
    // Ensure workspace association is maintained
    if (!appState.currentDocument.workspaceId && appState.currentWorkspace) {
      appState.currentDocument.workspaceId = appState.currentWorkspace.id;
      console.log(`[DOCUMENT] Added workspace association to document: ${appState.currentWorkspace.id}`);
    } else if (appState.currentWorkspace && appState.currentDocument.workspaceId !== appState.currentWorkspace.id) {
      // If document is from a different workspace but being saved in current workspace, update its association
      console.log(`[DOCUMENT] Updating document workspace from ${appState.currentDocument.workspaceId} to ${appState.currentWorkspace.id}`);
      appState.currentDocument.workspaceId = appState.currentWorkspace.id;
    }
    
    // Update content from editor
    const content = getEditorContent();
    
    // Add validation for content - ensure it's properly structured
    if (!Array.isArray(content)) {
      console.error('[DOCUMENT] Invalid content structure - expected array but got:', typeof content);
      if (!silent) showNotification("Error: Invalid document content structure", "error");
      reject(new Error("Invalid content structure"));
      return;
    }
    
    // More detailed validation of content structure
    if (content.length === 0) {
      console.warn('[DOCUMENT] Content array is empty - document will have no blocks');
    } else {
      // Check if content items have required properties
      const hasInvalidItems = content.some(item => !item.type || typeof item.content === 'undefined');
      if (hasInvalidItems) {
        console.error('[DOCUMENT] Content contains invalid items - some blocks may be missing required properties');
      }
    }
    
    // Log content structure before saving
    console.log('[DOCUMENT] Content structure being saved:', 
                `${content.length} blocks`, 
                'First block type:', content.length > 0 ? content[0].type : 'none',
                'Content array:', content);
    
    appState.currentDocument.content = content;
    
    console.log('[DOCUMENT] Saving document content with', content.length, 'blocks');

    // Save document to storage
    saveDocument(appState.currentDocument, { silent })
      .then((result) => {
        console.log('[DOCUMENT] Document saved successfully to storage');
        // If this was a draft document, add it to the document list and update sidebar
        if (isDraft) {
          console.log('[DOCUMENT] Adding new document to documentList (was draft)');
          // Use the sync helper to add to document list and update UI
          syncDocumentWithList(appState.currentDocument);
        } else {
          // Use our sync helper for consistency
          syncDocumentWithList(appState.currentDocument);
        }
        
        if (!silent) showNotification("Document saved", "success");
        resolve(result);
      })
      .catch((error) => {
        console.error("Error saving document:", error);
        if (!silent) showNotification("Failed to save document", "error");
        reject(error);
      });
  });
}

// Delete a document by ID
export function deleteDocument(id) {
  // Confirm deletion
  const confirm = window.confirm(
    "Are you sure you want to delete this document?"
  );
  if (!confirm) return;

  // Delete from storage
  deleteDocumentFromStorage(id)
    .then((result) => {
      // If deleting the current document, clear current document
      if (appState.currentDocument && appState.currentDocument.id === id) {
        appState.currentDocument = null;

        // Clear editor
        const editor = document.getElementById("editor");
        if (editor) editor.innerHTML = "";

        // Clear title
        const titleElement = document.getElementById("document-title");
        if (titleElement) titleElement.textContent = "";
      }

      // Remove from app state
      const index = appState.documentList.findIndex((doc) => doc.id === id);
      if (index !== -1) {
        appState.documentList.splice(index, 1);
      }

      // Update UI
      renderDocumentList();

      showNotification("Document deleted", "success");
    })
    .catch((error) => {
      console.error("Error deleting document:", error);
      showNotification("Failed to delete document", "error");
    });
}

// Export current document
export function exportCurrentDocument() {
  // Check if there's a current document
  if (!appState.currentDocument) {
    showNotification("No document to export", "error");
    return;
  }

  // Save document first to ensure latest content
  saveCurrentDocument(true);

  // Export document
  exportDocumentsToFile(appState.currentDocument.id)
    .then(() => {
      showNotification("Document exported", "success");
    })
    .catch((error) => {
      console.error("Error exporting document:", error);
      showNotification("Failed to export document", "error");
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
      showNotification("All documents exported", "success");
    })
    .catch((error) => {
      console.error("Error exporting documents:", error);
      showNotification("Failed to export documents", "error");
    });
}

// Import documents from file
export function importDocuments(file) {
  if (!file) {
    showNotification("No file selected", "error");
    return;
  }

  _importDocumentsFromFile(file)
    .then((result) => {
      showNotification(`Imported ${result.count} documents`, "success");
      loadDocumentList();
    })
    .catch((error) => {
      console.error("Error importing documents:", error);
      showNotification("Failed to import documents", "error");
    });
}

// Private helper function for importing
function _importDocumentsFromFile(file) {
  return new Promise((resolve, reject) => {
    importDocumentsFromFile(file)
      .then((result) => {
        resolve(result);
      })
      .catch(reject);
  });
}

// Load document list
export function loadDocumentList() {
  console.log('%c[DOCUMENT] loadDocumentList called', 'background: #047857; color: white; padding: 2px 4px; border-radius: 4px;');
  
  // First check if we have a current workspace
  if (!appState.currentWorkspace) {
    console.warn('[DOCUMENT] No current workspace, cannot load document list');
    return Promise.resolve([]);
  }
  
  console.log('[DOCUMENT] Loading documents for workspace:', appState.currentWorkspace.id);
  
  return listDocumentsFromStorage({ workspaceId: appState.currentWorkspace.id })
    .then((documents) => {
      console.log('[DOCUMENT] Loaded', documents.length, 'documents from storage for workspace', appState.currentWorkspace.id);
      
      // Check for documents without proper workspace association
      const documentsWithoutWorkspace = documents.filter(doc => !doc.workspaceId);
      if (documentsWithoutWorkspace.length > 0) {
        console.warn(`[DOCUMENT] Found ${documentsWithoutWorkspace.length} documents without workspace ID`);
      }
      
      // Debug: Show all document titles in the list
      documents.forEach((doc, index) => {
        console.log(`[DOCUMENT] Document ${index}: id=${doc.id}, title="${doc.title}", workspace=${doc.workspaceId || 'none'}`);
      });
      
      appState.documentList = documents;
      
      // Ensure the current document is in sync with the documentList
      if (appState.currentDocument) {
        const updatedDoc = documents.find(doc => doc.id === appState.currentDocument.id);
        if (updatedDoc) {
          console.log('[DOCUMENT] Keeping currentDocument in sync with documentList');
          appState.currentDocument = updatedDoc;
        }
      }
      
      renderDocumentList();
      console.log('[DOCUMENT] Document list rendering requested');
      return documents;
    })
    .catch((error) => {
      console.error("Error loading document list:", error);
      return [];
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
