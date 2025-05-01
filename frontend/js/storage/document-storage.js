/**
 * document-storage.js - Document-specific storage implementation
 * 
 * This module provides document-specific storage operations that leverage
 * the core storage manager for persistence.
 */

import { 
  initializeStorage, 
  saveData, 
  loadData, 
  deleteData, 
  listData,
  syncWithBackend,
  StorageStrategy
} from './storage-manager.js';

import { appState } from '../core/app-core.js';

// Store type for documents
const STORE_TYPE = 'documents';

// Initialize document storage
export async function initializeDocumentStorage(options = {}) {
  await initializeStorage(options);
}

/**
 * Save a document to storage
 * 
 * @param {Object} document - The document to save
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status and id
 */
export async function saveDocument(document, options = {}) {
  if (!document.id) {
    document.id = 'doc_' + Date.now();
  }
  
  // Ensure timestamps are set
  document.updatedAt = new Date().toISOString();
  if (!document.createdAt) {
    document.createdAt = document.updatedAt;
  }
  
  // Ensure workspace association is properly set
  if (!document.workspaceId && appState.currentWorkspace) {
    document.workspaceId = appState.currentWorkspace.id;
  }

  // Validate content structure before saving
  if (document.content && Array.isArray(document.content)) {
    // Ensure each block has required properties
    document.content = document.content.map(block => {
      // Make sure each block has the necessary properties
      if (!block.id) {
        block.id = 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      if (!block.createdAt) {
        block.createdAt = new Date().toISOString();
      }
      
      block.updatedAt = new Date().toISOString();
      
      // Ensure workspace association is present in each block
      block.workspaceId = document.workspaceId;
      
      return block;
    });
  }
  
  return await saveData(STORE_TYPE, document, options);
}

/**
 * Load a document from storage
 * 
 * @param {string} id - The document ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The document
 */
export async function loadDocument(id, options = {}) {
  return await loadData(STORE_TYPE, id, options);
}

/**
 * Delete a document from storage
 * 
 * @param {string} id - The document ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status
 */
export async function deleteDocument(id, options = {}) {
  return await deleteData(STORE_TYPE, id, options);
}

/**
 * List all documents in storage
 * 
 * @param {Object} filters - Optional filters to apply (e.g. workspace)
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Array>} - Array of documents
 */
export async function listDocuments(filters = {}, options = {}) {
  const documents = await listData(STORE_TYPE, options);
  
  // Apply filters if provided
  if (filters.workspaceId) {
    return documents.filter(doc => doc.workspaceId === filters.workspaceId);
  }
  
  return documents;
}

/**
 * Find documents that match the given criteria
 * 
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Array>} - Array of matching documents
 */
export async function findDocuments(criteria = {}, options = {}) {
  const documents = await listDocuments({}, options);
  
  // Apply criteria filtering
  return documents.filter(doc => {
    for (const [key, value] of Object.entries(criteria)) {
      // Simple string match for now
      if (typeof value === 'string' && doc[key] !== value) {
        return false;
      }
      
      // Array contains
      if (Array.isArray(value) && !value.includes(doc[key])) {
        return false;
      }
      
      // Date range
      if (value.from && value.to) {
        const docDate = new Date(doc[key]);
        if (docDate < new Date(value.from) || docDate > new Date(value.to)) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Search documents by content or title
 * 
 * @param {string} query - The search query
 * @param {Object} options - Search options (fields to search, etc.)
 * @returns {Promise<Array>} - Array of matching documents
 */
export async function searchDocuments(query, options = {}) {
  if (!query) {
    return [];
  }
  
  const searchOptions = {
    fields: ['title', 'content'],
    ...options
  };
  
  const documents = await listDocuments({}, options);
  const lowerQuery = query.toLowerCase();
  
  return documents.filter(doc => {
    // Search in title
    if (searchOptions.fields.includes('title') && 
        doc.title && doc.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in content blocks
    if (searchOptions.fields.includes('content') && doc.content) {
      // Search through all content blocks
      return doc.content.some(block => {
        if (typeof block.content === 'string' && 
            block.content.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        return false;
      });
    }
    
    return false;
  });
}

/**
 * Force synchronization of documents with backend
 * 
 * @returns {Promise<Object>} - Sync result
 */
export async function syncDocuments() {
  return await syncWithBackend();
}

/**
 * Export document(s) to JSON file for download
 * 
 * @param {string|Array} ids - Document ID or array of IDs to export
 * @returns {Promise<void>} - Creates download link for the file
 */
export async function exportDocuments(ids) {
  const toExport = Array.isArray(ids) ? ids : [ids];
  const documents = [];
  
  // Collect all documents
  for (const id of toExport) {
    try {
      const doc = await loadDocument(id);
      documents.push(doc);
    } catch (error) {
      console.error(`Error exporting document ${id}:`, error);
    }
  }
  
  if (documents.length === 0) {
    throw new Error('No documents found to export');
  }
  
  // Prepare export data
  const exportData = {
    documents,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  // Create download blob
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = documents.length === 1 
    ? `${documents[0].title.replace(/\s+/g, '_')}.json` 
    : `foundry_export_${new Date().toISOString().split('T')[0]}.json`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Import documents from JSON file
 * 
 * @param {File} file - The JSON file to import
 * @returns {Promise<Array>} - Array of imported document IDs
 */
export async function importDocuments(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.documents || !Array.isArray(data.documents)) {
          throw new Error('Invalid document export file format');
        }
        
        const importedIds = [];
        
        // Import each document
        for (const doc of data.documents) {
          // Generate new ID to avoid overwriting existing documents
          const newId = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          
          const importedDoc = {
            ...doc,
            id: newId,
            importedFrom: doc.id,
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const result = await saveDocument(importedDoc);
          importedIds.push(result.id);
        }
        
        resolve(importedIds);
      } catch (error) {
        reject(new Error(`Failed to import documents: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read import file'));
    };
    
    reader.readAsText(file);
  });
} 