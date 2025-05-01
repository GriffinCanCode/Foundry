/**
 * optimization-examples.js - Practical examples of applying optimizations
 * 
 * This file contains ready-to-use optimized versions of functions from the codebase.
 * Import these optimized functions to replace their slower counterparts.
 */

import { 
  debounce, 
  throttle, 
  memoize, 
  batchDOM, 
  runWhenIdle, 
  delegateEvent,
  FastDOM,
  Cache
} from '../optimizer.js';

/**
 * OPTIMIZED DRAG AND DROP FUNCTIONS
 * 
 * These functions are optimized versions of the drag and drop handlers
 * in editor.js. They use throttling to improve performance during drag operations.
 */

// Keep track of drag state
let draggedItem = null;
let dropIndicator = null;

/**
 * Throttled version of updateDropIndicator for better performance
 * This avoids excessive DOM updates during rapid mouse movements
 * @param {number} posY - Y position for the indicator
 * @param {HTMLElement} editor - The editor element containing blocks
 */
export const throttledUpdateDropIndicator = throttle(function(posY, editor) {
  // Skip if no editor or draggedItem
  if (!editor || !draggedItem) return;
  
  // Create indicator if it doesn't exist
  if (!dropIndicator) {
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    dropIndicator.style.cssText = 'position: absolute; left: 0; right: 0; height: 3px; background-color: #0284c7; z-index: 1000; pointer-events: none; transition: transform 0.1s ease;';
    document.body.appendChild(dropIndicator);
  }
  
  // Get all blocks except the one being dragged
  const blocks = Array.from(editor.children).filter(block => block !== draggedItem);
  if (!blocks.length) {
    // If no other blocks, position at the top of editor
    const editorRect = editor.getBoundingClientRect();
    dropIndicator.style.width = `${editorRect.width}px`;
    dropIndicator.style.transform = `translate(${editorRect.left}px, ${editorRect.top}px)`;
    dropIndicator.style.display = 'block';
    return;
  }
  
  // Find the closest block to insert before/after
  let closestBlock = null;
  let closestDistance = Infinity;
  let insertAfter = false;
  
  blocks.forEach(block => {
    const rect = block.getBoundingClientRect();
    const blockMiddle = rect.top + rect.height / 2;
    const distance = Math.abs(posY - blockMiddle);
    
    if (distance < closestDistance) {
      closestBlock = block;
      closestDistance = distance;
      insertAfter = posY > blockMiddle;
    }
  });
  
  if (closestBlock) {
    const rect = closestBlock.getBoundingClientRect();
    const dropPosition = insertAfter ? rect.bottom : rect.top;
    
    // Position and show the indicator
    dropIndicator.style.width = `${rect.width}px`;
    dropIndicator.style.transform = `translate(${rect.left}px, ${dropPosition}px)`;
    dropIndicator.style.display = 'block';
    
    // Store the insertion point for use during drop
    dropIndicator.dataset.insertAfter = insertAfter ? 'true' : 'false';
    dropIndicator.dataset.targetId = closestBlock.id;
  }
}, 30); // 30ms throttle for smooth visual updates

/**
 * Optimized drag start handler
 * @param {DragEvent} e - The drag event
 */
export function optimizedHandleDragStart(e) {
  draggedItem = e.target.closest('.block-container');
  if (!draggedItem) return;

  // Add dragging style effect with animation
  requestAnimationFrame(() => {
    if (draggedItem) {
      draggedItem.classList.add('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
    }
  });

  // Set data transfer (required for Firefox)
  e.dataTransfer.setData('text/plain', draggedItem.id);
  e.dataTransfer.effectAllowed = 'move';
}

/**
 * Optimized drag over handler
 * @param {DragEvent} e - The drag event
 */
export function optimizedHandleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // Find the editor element
  const editor = document.getElementById('editor');
  if (!editor) return;
  
  // Use throttled function for better performance
  throttledUpdateDropIndicator(e.clientY, editor);
}

/**
 * Hide drop indicator
 */
export function optimizedHideDropIndicator() {
  if (dropIndicator) {
    dropIndicator.style.display = 'none';
  }
}

/**
 * Optimized drag leave handler
 * @param {DragEvent} e - The drag event
 */
export function optimizedHandleDragLeave(e) {
  // Only hide indicator if leaving the editor area
  const editorArea = document.getElementById('editor');
  if (!editorArea) return;
  
  const rect = editorArea.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    optimizedHideDropIndicator();
  }
}

/**
 * Optimized drop handler
 * @param {DragEvent} e - The drop event
 */
export function optimizedHandleDrop(e) {
  e.preventDefault();
  
  // Clean up drag effects
  if (draggedItem) {
    draggedItem.classList.remove('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
  }
  
  // Early exit if indicator is not visible
  if (!dropIndicator || dropIndicator.style.display === 'none') {
    return;
  }
  
  const editor = document.getElementById('editor');
  if (!editor || !draggedItem) return;
  
  // Get target information from the indicator
  const targetId = dropIndicator.dataset.targetId;
  const insertAfter = dropIndicator.dataset.insertAfter === 'true';
  
  if (targetId) {
    const targetBlock = document.getElementById(targetId);
    if (targetBlock && targetBlock !== draggedItem) {
      // Use performant DOM operation
      if (insertAfter) {
        // Insert after target
        if (targetBlock.nextSibling) {
          editor.insertBefore(draggedItem, targetBlock.nextSibling);
        } else {
          editor.appendChild(draggedItem);
        }
      } else {
        // Insert before target
        editor.insertBefore(draggedItem, targetBlock);
      }
    }
  } else if (editor.children.length === 0 || (editor.children.length === 1 && editor.children[0] === draggedItem)) {
    // If editor is empty (except for the dragged item), append
    editor.appendChild(draggedItem);
  }
  
  // Hide the indicator
  optimizedHideDropIndicator();
  
  // Reset drag state
  draggedItem = null;
}

/**
 * Optimized drag end handler
 * @param {DragEvent} e - The drag end event
 */
export function optimizedHandleDragEnd(e) {
  // Clean up drag effects
  if (draggedItem) {
    draggedItem.classList.remove('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
  }
  
  // Hide the indicator
  optimizedHideDropIndicator();
  
  // Reset drag state
  draggedItem = null;
}

/**
 * OPTIMIZED DOM CREATION
 * 
 * An optimized version of the createBlockElement function using FastDOM.
 * This is a simplified example - the full implementation would need to
 * incorporate all the logic from the original function.
 */

/**
 * Create a text block with optimized DOM operations
 * @param {string} content - Block content
 * @returns {HTMLElement} - Created block element
 */
export function createOptimizedTextBlock(content = '') {
  // Use FastDOM for efficient creation
  return FastDOM.createElement('div', {
    className: 'block-container group relative transition-all duration-200 hover:bg-surface-50 rounded-lg p-3',
    id: `block-${Date.now()}`,
    draggable: true,
    // Add event listeners directly in the attributes object
    ondragstart: optimizedHandleDragStart,
    ondragover: optimizedHandleDragOver,
    ondragleave: optimizedHandleDragLeave,
    ondrop: optimizedHandleDrop,
    ondragend: optimizedHandleDragEnd
  }, FastDOM.appendChildren(document.createDocumentFragment(), [
    // Create block controls
    FastDOM.createElement('div', {
      className: 'block-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-surface-400">
        <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
      </svg>`,
      onmousedown: e => e.preventDefault()
    }),
    
    // Create block options
    FastDOM.createElement('div', {
      className: 'block-options opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      innerHTML: `
        <button class="edit-block-btn p-1.5 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
        </button>
        <button class="delete-block-btn p-1.5 rounded-md text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
      `
    }),
    
    // Create text block element
    FastDOM.createElement('p', {
      className: 'editable-block text-block text-surface-800 leading-relaxed',
      contentEditable: true,
      dataset: {
        placeholder: 'Type / for commands or start typing...'
      }
    }, content)
  ]));
}

/**
 * OPTIMIZED DATA LOADING
 * 
 * An example of loading data with optimization for better UX
 */

/**
 * Load document with optimization for better UX
 * @param {string} docId - Document ID to load
 */
export async function loadDocumentOptimized(docId) {
  try {
    // Show loading indicator immediately
    showLoadingIndicator();
    
    // Load the essential data first (document metadata)
    const docMetadata = await fetchDocumentMetadata(docId);
    
    // Render the document shell for immediate UI feedback
    renderDocumentShell(docMetadata);
    
    // Load the document content in the background
    const docContentPromise = fetchDocumentContent(docId);
    
    // Do other UI initialization that doesn't depend on content
    setupDocumentToolbar(docMetadata);
    
    // When content is ready, render it
    const docContent = await docContentPromise;
    renderDocumentContent(docContent);
    
    // Load heavy resources during idle time
    runWhenIdle(() => {
      loadRelatedDocuments(docId);
      cacheCommonResources();
    });
    
    // Hide loading indicator
    hideLoadingIndicator();
  } catch (error) {
    // Handle errors
    console.error('Error loading document:', error);
    showErrorMessage('Failed to load document');
    hideLoadingIndicator();
  }
}

// Placeholder functions for the example
function showLoadingIndicator() {}
function hideLoadingIndicator() {}
function showErrorMessage() {}
function fetchDocumentMetadata() {
  return Promise.resolve({});
}
function fetchDocumentContent() {
  return Promise.resolve({});
}
function renderDocumentShell() {}
function renderDocumentContent() {}
function setupDocumentToolbar() {}
function loadRelatedDocuments() {}
function cacheCommonResources() {} 