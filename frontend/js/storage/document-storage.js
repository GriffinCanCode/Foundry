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
  const { silent = false } = options;
  
  console.log(`[STORAGE] Saving document ${document.id}, title: ${document.title}, has content: ${Boolean(document.content)}, content blocks: ${document.content?.length || 0}`);
  
  if (document.content && document.content.length > 0) {
    // Log first block as sample
    const firstBlock = document.content[0];
    console.log(`[STORAGE] First block sample - type: ${firstBlock.type}, content: "${firstBlock.content?.substring(0, 30)}${firstBlock.content?.length > 30 ? '...' : ''}", length: ${firstBlock.content?.length}`);
  }
  
  if (!document.id) {
    document.id = 'doc_' + Date.now();
  }
  
  // Ensure timestamps are properly set
  document.updatedAt = new Date().toISOString();
  document.updated = new Date().toISOString(); // For backward compatibility
  
  if (!document.createdAt) {
    document.createdAt = document.updatedAt;
  }
  if (!document.created) {
    document.created = document.updatedAt; // For backward compatibility 
  }
  
  // Ensure workspace association is properly set
  if (!document.workspaceId && appState.currentWorkspace) {
    document.workspaceId = appState.currentWorkspace.id;
  }

  // Validate content structure before saving
  if (document.content && Array.isArray(document.content)) {
    // Ensure each block has required properties
    document.content = document.content.map(block => {
      // Create a clean copy of the block to ensure no circular references
      const cleanBlock = { ...block };
      
      // Make sure each block has the necessary properties
      if (!cleanBlock.id) {
        cleanBlock.id = 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      if (!cleanBlock.createdAt) {
        cleanBlock.createdAt = new Date().toISOString();
      }
      
      cleanBlock.updatedAt = new Date().toISOString();
      
      // Ensure workspace association is present in each block
      cleanBlock.workspaceId = document.workspaceId;
      
      return cleanBlock;
    });
  }
  
  // Ensure we're not storing undefined or null values
  const cleanDocument = { ...document };
  Object.keys(cleanDocument).forEach(key => {
    if (cleanDocument[key] === undefined || cleanDocument[key] === null) {
      delete cleanDocument[key];
    }
  });
  
  console.log('Saving document with ID:', cleanDocument.id, 'Title:', cleanDocument.title, 'Workspace:', cleanDocument.workspaceId);
  
  try {
    const result = await saveData(STORE_TYPE, cleanDocument, options);
    console.log('Document saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
}

/**
 * Load a document from storage
 * 
 * @param {string} id - The document ID
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The document
 */
export async function loadDocument(id, options = {}) {
  if (!id) {
    throw new Error('Document ID is required');
  }

  try {
    // Get the document from storage
    const doc = await loadData(STORE_TYPE, id, options);
    
    if (!doc) {
      throw new Error(`Document not found: ${id}`);
    }
    
    console.log(`[STORAGE] Loaded document ${doc.id}, title: ${doc.title}, has content: ${Boolean(doc.content)}, content blocks: ${doc.content?.length || 0}`);
    
    if (doc.content && doc.content.length > 0) {
      // Log first block as sample
      const firstBlock = doc.content[0];
      console.log(`[STORAGE] First loaded block sample - type: ${firstBlock.type}, content: "${firstBlock.content?.substring(0, 30)}${firstBlock.content?.length > 30 ? '...' : ''}", length: ${firstBlock.content?.length}`);
    }
    
    // Ensure the document has all required properties
    if (!doc.workspaceId && appState.currentWorkspace) {
      doc.workspaceId = appState.currentWorkspace.id;
      console.log('Added missing workspace ID to document:', doc.workspaceId);
    }
    
    // Ensure consistent timestamps
    if (!doc.updated && doc.updatedAt) {
      doc.updated = doc.updatedAt;
    }
    if (!doc.created && doc.createdAt) {
      doc.created = doc.createdAt;
    }
    
    // Ensure content is always an array
    if (!doc.content) {
      doc.content = [];
    } else if (Array.isArray(doc.content)) {
      // Ensure each block has valid content
      doc.content = doc.content.map(block => {
        // Skip if block is not a valid object
        if (!block || typeof block !== 'object') {
          return null;
        }

        // Ensure content property exists and is at least an empty string
        if (block.content === undefined || block.content === null) {
          console.warn(`[STORAGE] Block ${block.id || 'unknown'} of type ${block.type || 'unknown'} has missing content, fixing`);
          block.content = '';
        }

        return block;
      }).filter(block => block !== null); // Remove any invalid blocks

      console.log(`[STORAGE] Validated ${doc.content.length} blocks in document content`);
    }
    
    console.log('Document loaded successfully:', doc.title);
    return doc;
  } catch (error) {
    console.error(`Error loading document ${id}:`, error);
    throw error;
  }
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
  try {
    const documents = await listData(STORE_TYPE, options);
    
    // Validate and repair documents if needed
    const validatedDocs = documents.map(doc => {
      // Create a clean copy to avoid modifying original cache
      const validDoc = { ...doc };
      
      // Ensure required properties exist
      if (!validDoc.id) {
        console.warn('Document without ID found, skipping');
        return null;
      }
      
      // Fix any missing metadata
      if (!validDoc.title) validDoc.title = 'Untitled';
      if (!validDoc.workspaceId && appState.currentWorkspace) {
        validDoc.workspaceId = appState.currentWorkspace.id;
      }
      
      // Normalize timestamps
      if (!validDoc.updated && validDoc.updatedAt) validDoc.updated = validDoc.updatedAt;
      if (!validDoc.created && validDoc.createdAt) validDoc.created = validDoc.createdAt;
      
      // Ensure content is always an array
      if (!validDoc.content) validDoc.content = [];
      
      return validDoc;
    }).filter(Boolean); // Remove null entries
    
    // Apply workspace filter if provided
    if (filters.workspaceId) {
      console.log(`Filtering documents by workspace: ${filters.workspaceId}`);
      return validatedDocs.filter(doc => doc.workspaceId === filters.workspaceId);
    }
    
    console.log(`Retrieved ${validatedDocs.length} documents`);
    return validatedDocs;
  } catch (error) {
    console.error('Error listing documents:', error);
    return [];
  }
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
  if (!query || typeof query !== 'string') {
    return [];
  }
  
  try {
    const searchOptions = {
      fields: ['title', 'content'],
      workspaceId: appState.currentWorkspace?.id, // Default to current workspace
      ...options
    };
    
    // Get documents, filtered by workspace if specified
    const documents = await listDocuments(
      searchOptions.workspaceId ? { workspaceId: searchOptions.workspaceId } : {},
      options
    );
    
    if (!documents || !Array.isArray(documents)) {
      console.warn('Invalid document list returned during search');
      return [];
    }
    
    const lowerQuery = query.toLowerCase().trim();
    console.log(`Searching for "${lowerQuery}" in ${documents.length} documents`);
    
    // Score-based search results (higher is better match)
    const scoredResults = documents.map(doc => {
      let score = 0;
      const reasons = [];
      
      // Search in title (higher weight)
      if (searchOptions.fields.includes('title') && doc.title) {
        const titleLower = doc.title.toLowerCase();
        
        // Exact match gets highest score
        if (titleLower === lowerQuery) {
          score += 100;
          reasons.push('exact title match');
        } 
        // Title starts with query
        else if (titleLower.startsWith(lowerQuery)) {
          score += 50;
          reasons.push('title starts with query');
        }
        // Title contains query
        else if (titleLower.includes(lowerQuery)) {
          score += 25;
          reasons.push('title contains query');
        }
      }
      
      // Search in content
      if (searchOptions.fields.includes('content') && doc.content && Array.isArray(doc.content)) {
        // Count matches in content blocks
        let contentMatches = 0;
        
        doc.content.forEach(block => {
          if (block && typeof block.content === 'string') {
            if (block.content.toLowerCase().includes(lowerQuery)) {
              contentMatches++;
            }
          }
        });
        
        if (contentMatches > 0) {
          score += 10 + (contentMatches * 2); // Base score + bonus for multiple matches
          reasons.push(`${contentMatches} content matches`);
        }
      }
      
      // Only return documents with matches
      return score > 0 ? { doc, score, reasons } : null;
    }).filter(Boolean);
    
    // Sort by score (highest first)
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Return just the documents, maintaining sort order
    const results = scoredResults.map(item => item.doc);
    console.log(`Found ${results.length} matching documents`);
    
    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
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

/**
 * Repair and validate all document data
 * 
 * This performs a full scan of stored documents, fixing any corruption or missing data
 * and ensuring all documents have proper workspace association.
 * 
 * @returns {Promise<Object>} - Results of the repair operation
 */
export async function repairDocumentData() {
  try {
    console.log('Starting document data repair process...');
    const startTime = Date.now();
    
    // Get all documents without filtering
    const allDocuments = await listData(STORE_TYPE, { bypassCache: true });
    
    if (!allDocuments || !Array.isArray(allDocuments)) {
      throw new Error('Failed to retrieve documents');
    }
    
    console.log(`Found ${allDocuments.length} documents to check`);
    
    // Track repair statistics
    const stats = {
      total: allDocuments.length,
      repaired: 0,
      failed: 0,
      workspaceFixed: 0,
      contentFixed: 0,
      timestampFixed: 0,
      titleFixed: 0,
      errors: []
    };
    
    // Process each document
    for (const doc of allDocuments) {
      try {
        let needsRepair = false;
        let repairs = [];
        
        // Create a clean copy for repairs
        const repairedDoc = { ...doc };
        
        // Fix missing title
        if (!repairedDoc.title) {
          repairedDoc.title = 'Untitled';
          needsRepair = true;
          repairs.push('fixed missing title');
          stats.titleFixed++;
        }
        
        // Fix missing workspace
        if (!repairedDoc.workspaceId && appState.currentWorkspace) {
          repairedDoc.workspaceId = appState.currentWorkspace.id;
          needsRepair = true;
          repairs.push('added workspace association');
          stats.workspaceFixed++;
        }
        
        // Fix timestamp inconsistencies
        if (!repairedDoc.updated || !repairedDoc.updatedAt) {
          const timestamp = new Date().toISOString();
          repairedDoc.updated = timestamp;
          repairedDoc.updatedAt = timestamp;
          needsRepair = true;
          repairs.push('fixed timestamps');
          stats.timestampFixed++;
        }
        
        // Fix content issues
        if (!repairedDoc.content || !Array.isArray(repairedDoc.content)) {
          repairedDoc.content = [];
          needsRepair = true;
          repairs.push('fixed invalid content');
          stats.contentFixed++;
        } else {
          // Fix individual content blocks
          repairedDoc.content = repairedDoc.content.map(block => {
            if (!block || typeof block !== 'object') {
              return {
                id: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'text',
                content: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                workspaceId: repairedDoc.workspaceId
              };
            }
            
            const fixedBlock = { ...block };
            
            // Ensure block has required fields
            if (!fixedBlock.id) {
              fixedBlock.id = 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            
            if (!fixedBlock.type) {
              fixedBlock.type = 'text';
            }
            
            if (!fixedBlock.content && fixedBlock.content !== '') {
              fixedBlock.content = '';
            }
            
            // Ensure block has timestamps
            if (!fixedBlock.createdAt) {
              fixedBlock.createdAt = new Date().toISOString();
            }
            
            fixedBlock.updatedAt = new Date().toISOString();
            
            // Ensure block has workspace ID
            fixedBlock.workspaceId = repairedDoc.workspaceId;
            
            return fixedBlock;
          });
        }
        
        // If document needed repairs, save the fixed version
        if (needsRepair) {
          await saveData(STORE_TYPE, repairedDoc, { silent: true });
          stats.repaired++;
          console.log(`Repaired document ${repairedDoc.id}: ${repairs.join(', ')}`);
        }
      } catch (docError) {
        console.error(`Error repairing document ${doc.id}:`, docError);
        stats.failed++;
        stats.errors.push({
          id: doc.id,
          error: docError.message
        });
      }
    }
    
    // Calculate timing
    const duration = Date.now() - startTime;
    stats.durationMs = duration;
    stats.durationSec = (duration / 1000).toFixed(2);
    
    console.log('Document repair complete:', stats);
    return stats;
  } catch (error) {
    console.error('Document repair process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 