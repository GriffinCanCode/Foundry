/**
 * editor.js - Compatibility layer for legacy code
 * 
 * This file ensures backward compatibility with existing code that might
 * directly reference the old editor.js. It imports and re-exports functionality
 * from our new modular structure.
 */

import { 
    createBlockElement, 
    addBlock, 
    addDatabaseBlock,
    showBlockMenu,
    hideBlockMenu,
    showSlashCommandMenu,
    transformBlock,
    insertBlockAfter
} from './modules/blocks.js';
import { 
    handleDragStart, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    handleDragEnd 
} from './modules/drag-drop.js';

// Re-export all the functions for backward compatibility
window.createBlockElement = createBlockElement;
window.addBlock = addBlock;
window.addDatabaseBlock = addDatabaseBlock;
window.showBlockMenu = showBlockMenu;
window.hideBlockMenu = hideBlockMenu;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleDragEnd = handleDragEnd;
window.showSlashCommandMenu = showSlashCommandMenu;
window.transformBlock = transformBlock;
window.insertBlockAfter = insertBlockAfter;

console.warn('Using editor.js compatibility layer - consider updating your imports to use the modular structure directly');

const editor = document.getElementById('editor');
let blockIdCounter = 0; // Simple counter for unique IDs
let draggedItem = null;
let dropIndicator = null; // Reference to the visual indicator line

// Function to create a new block element with enhanced styling
function createBlockElement(type, content = '') {
    const blockContainer = document.createElement('div');
    // Base classes for container with improved styling
    blockContainer.className = 'block-container group relative transition-all duration-200 hover:bg-surface-50 rounded-lg p-3';
    blockContainer.id = `block-${blockIdCounter++}`;
    blockContainer.draggable = true; // Make the container draggable

    // --- Event Listeners for Drag & Drop ---
    blockContainer.addEventListener('dragstart', handleDragStart);
    blockContainer.addEventListener('dragover', handleDragOver);
    blockContainer.addEventListener('dragleave', handleDragLeave);
    blockContainer.addEventListener('drop', handleDrop);
    blockContainer.addEventListener('dragend', handleDragEnd);

    // --- Drag Handle with improved styling ---
    const controls = document.createElement('div');
    controls.className = 'block-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200';
    controls.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-surface-400">
          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
        </svg>
    `;
    // Prevent handle from interfering with text selection/editing
    controls.addEventListener('mousedown', (e) => e.preventDefault());
    blockContainer.appendChild(controls);

    // Add options menu button with improved styling
    const blockOptions = document.createElement('div');
    blockOptions.className = 'block-options opacity-0 group-hover:opacity-100 transition-opacity duration-200';
    blockOptions.innerHTML = `
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
    `;
    
    // Add edit handler
    blockOptions.querySelector('.edit-block-btn').addEventListener('click', () => {
        editBlock(blockContainer);
    });
    
    // Add delete handler with confirmation dialog
    blockOptions.querySelector('.delete-block-btn').addEventListener('click', () => {
        const confirmDelete = confirm('Delete this block?');
        if (confirmDelete) {
            // Apply delete animation
            blockContainer.style.opacity = '0';
            blockContainer.style.transform = 'translateY(-10px)';
            blockContainer.style.transition = 'opacity 300ms, transform 300ms';
            
            setTimeout(() => {
                blockContainer.remove();
            }, 300);
        }
    });
    
    blockContainer.appendChild(blockOptions);

    // --- Block Content based on Type ---
    let blockElement; // The actual editable element or specific structure

    switch (type) {
        case 'heading':
            blockElement = document.createElement('h2');
            // Apply base editable and specific heading styles
            blockElement.className = 'editable-block heading-block font-display font-semibold text-2xl';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Heading';
            blockElement.textContent = content;
            blockContainer.appendChild(blockElement); // Append directly
            break;

        case 'todo':
            // To-do uses a different structure within the container
            blockContainer.classList.add('todo-block-container'); // Use specific class for styling flex etc.
            // Remove padding-left from container as flex handles spacing
            blockContainer.style.paddingLeft = '30px'; // Keep space for handle

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';

            const textSpan = document.createElement('span');
            // Apply base editable and specific text styles
            textSpan.className = 'editable-block todo-text';
            textSpan.contentEditable = true;
            textSpan.dataset.placeholder = 'To-do item';
            textSpan.textContent = content;

            // Event listener for checkbox change
            checkbox.addEventListener('change', (e) => {
                textSpan.classList.toggle('line-through', e.target.checked);
            });

            // Append checkbox and text span to the container
            // Controls are already added first
            blockContainer.appendChild(checkbox);
            blockContainer.appendChild(textSpan);
            break;

        case 'list':
            blockElement = document.createElement('ul');
            blockElement.className = 'editable-block list-block pl-5 list-disc space-y-1';
            
            const listItem = document.createElement('li');
            listItem.contentEditable = true;
            listItem.textContent = content || 'List item';
            
            blockElement.appendChild(listItem);
            blockContainer.appendChild(blockElement);
            
            // Handle enter key to create new list items with better positioning
            blockElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const newItem = document.createElement('li');
                    newItem.contentEditable = true;
                    
                    // Get selection and current list item
                    const selection = window.getSelection();
                    const currentItem = selection.anchorNode.nodeType === 3 ? 
                                      selection.anchorNode.parentNode : 
                                      selection.anchorNode;
                    
                    // Split text at cursor if needed
                    if (selection.anchorOffset < currentItem.textContent.length) {
                        const remainingText = currentItem.textContent.substring(selection.anchorOffset);
                        currentItem.textContent = currentItem.textContent.substring(0, selection.anchorOffset);
                        newItem.textContent = remainingText;
                    }
                    
                    // Insert after current item
                    if (currentItem.nextSibling) {
                        blockElement.insertBefore(newItem, currentItem.nextSibling);
                    } else {
                        blockElement.appendChild(newItem);
                    }
                    
                    // Focus the new item
                    setTimeout(() => {
                        const range = document.createRange();
                        range.setStart(newItem, 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }, 0);
                }
            });
            break;

        case 'quote':
            blockContainer.classList.add('quote-block-container');
            blockElement = document.createElement('blockquote');
            blockElement.className = 'editable-block quote-block pl-4 border-l-4 border-primary-300 italic text-surface-700';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Quote';
            blockElement.textContent = content;
            blockContainer.appendChild(blockElement);
            break;

        case 'code':
            blockContainer.classList.add('code-block-container');
            
            // Create a code container with pre and code elements
            const preElement = document.createElement('pre');
            preElement.className = 'bg-surface-100 rounded-lg p-4 overflow-x-auto';
            
            blockElement = document.createElement('code');
            blockElement.className = 'editable-block code-block text-sm font-mono';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Code';
            blockElement.textContent = content;
            
            preElement.appendChild(blockElement);
            blockContainer.appendChild(preElement);
            
            // Add language selector with improved styling
            const languageSelector = document.createElement('select');
            languageSelector.className = 'absolute right-3 top-3 text-xs bg-surface-200 hover:bg-surface-300 transition-colors border-none rounded-md px-2 py-1';
            languageSelector.innerHTML = `
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="bash">Bash</option>
            `;
            preElement.style.position = 'relative';
            preElement.appendChild(languageSelector);
            break;

        case 'database':
            blockContainer.classList.add('database-block-container');
            
            // Create a database reference block with improved styling
            const dbWrapper = document.createElement('div');
            dbWrapper.className = 'border border-surface-200 rounded-lg p-4 bg-surface-50';
            
            const dbHeader = document.createElement('div');
            dbHeader.className = 'flex items-center justify-between mb-3';
            
            const dbTitle = document.createElement('h3');
            dbTitle.className = 'font-medium text-surface-800 flex items-center';
            dbTitle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-primary-500">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                ${content || 'Database'}
            `;
            
            const dbControls = document.createElement('div');
            dbControls.className = 'flex space-x-2';
            dbControls.innerHTML = `
                <button class="px-3 py-1.5 text-xs bg-primary-50 text-primary-600 font-medium rounded-md hover:bg-primary-100 transition-colors">View</button>
                <button class="px-3 py-1.5 text-xs bg-surface-100 text-surface-700 font-medium rounded-md hover:bg-surface-200 transition-colors">Properties</button>
            `;
            
            dbHeader.appendChild(dbTitle);
            dbHeader.appendChild(dbControls);
            
            const dbPreview = document.createElement('div');
            dbPreview.className = 'text-sm text-surface-500';
            dbPreview.innerHTML = 'Click "View" to open database';
            
            dbWrapper.appendChild(dbHeader);
            dbWrapper.appendChild(dbPreview);
            blockContainer.appendChild(dbWrapper);
            
            // Handle database view button click
            dbControls.querySelector('button').addEventListener('click', () => {
                // Toggle the sample database view for demonstration
                const sampleDB = document.getElementById('sample-database');
                if (sampleDB) {
                    if (sampleDB.style.display === 'none') {
                        sampleDB.style.opacity = '0';
                        sampleDB.style.display = 'block';
                        setTimeout(() => {
                            sampleDB.style.opacity = '1';
                            sampleDB.style.transition = 'opacity 300ms';
                        }, 10);
                    } else {
                        sampleDB.style.opacity = '0';
                        sampleDB.style.transition = 'opacity 300ms';
                        setTimeout(() => {
                            sampleDB.style.display = 'none';
                        }, 300);
                    }
                }
            });
            break;

        case 'text':
        default: // Default to text block
            blockElement = document.createElement('p');
            // Apply base editable and specific text styles
            blockElement.className = 'editable-block text-block text-surface-800 leading-relaxed';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Type / for commands or start typing...';
            blockElement.textContent = content;
            blockContainer.appendChild(blockElement); // Append directly
            
            // Add support for markdown-style formatting
            blockElement.addEventListener('keydown', handleMarkdownShortcuts);
            break;
    }

    // Add key handler for block transformation and navigation
    const editableElement = blockContainer.querySelector('[contenteditable=true]');
    if (editableElement) {
        editableElement.addEventListener('keydown', (e) => {
            // Enter key creates a new block below
            if (e.key === 'Enter' && !e.shiftKey && 
                (type !== 'list' && type !== 'code')) { // Lists handle their own Enter key
                e.preventDefault();
                
                // Create a new text block after this one
                const newBlock = insertBlockAfter(blockContainer, 'text');
                
                // Focus the new block
                const newEditable = newBlock.querySelector('[contenteditable=true]');
                if (newEditable) {
                    newEditable.focus();
                }
            }
            
            // Backspace on empty block removes it
            if (e.key === 'Backspace' && editableElement.textContent.trim() === '') {
                if (editor.children.length > 1) { // Don't remove the last block
                    e.preventDefault();
                    
                    // Find the previous block to focus after removal
                    const prevBlock = blockContainer.previousElementSibling;
                    
                    // Animate block removal
                    blockContainer.style.opacity = '0';
                    blockContainer.style.transform = 'translateY(-10px)';
                    blockContainer.style.transition = 'opacity 300ms, transform 300ms';
                    
                    setTimeout(() => {
                        blockContainer.remove();
                        
                        if (prevBlock) {
                            const prevEditable = prevBlock.querySelector('[contenteditable=true]');
                            if (prevEditable) {
                                prevEditable.focus();
                                // Place cursor at the end
                                const range = document.createRange();
                                const sel = window.getSelection();
                                range.selectNodeContents(prevEditable);
                                range.collapse(false); // false = collapse to end
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        }
                    }, 300);
                }
            }
            
            // Implement slash commands
            if (e.key === '/' && (editableElement.textContent.trim() === '' || 
                                 window.getSelection().anchorOffset === 0)) {
                e.preventDefault();
                // This calls the showSlashCommandMenu function imported from modules/blocks.js
                showSlashCommandMenu(blockContainer);
            }
        });
    }

    // Add entrance animation for new blocks
    blockContainer.style.opacity = '0';
    blockContainer.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        blockContainer.style.opacity = '1';
        blockContainer.style.transform = 'translateY(0)';
        blockContainer.style.transition = 'opacity 300ms, transform 300ms';
    }, 10);

    return blockContainer; // Return the fully constructed container
}

// Handle markdown shortcuts
function handleMarkdownShortcuts(e) {
    const element = e.target;
    
    // Detect common markdown patterns and convert them
    if (e.key === ' ') {
        const text = element.textContent;
        let matched = false;
        
        // Heading conversion
        if (text.match(/^#\s$/)) {
            e.preventDefault();
            transformBlock(element.closest('.block-container'), 'heading');
            matched = true;
        }
        // To-do conversion
        else if (text.match(/^\[\]\s$/)) {
            e.preventDefault();
            transformBlock(element.closest('.block-container'), 'todo');
            matched = true;
        }
        // List conversion
        else if (text.match(/^-\s$/)) {
            e.preventDefault();
            transformBlock(element.closest('.block-container'), 'list');
            matched = true;
        }
        // Quote conversion
        else if (text.match(/^>\s$/)) {
            e.preventDefault();
            transformBlock(element.closest('.block-container'), 'quote');
            matched = true;
        }
        // Code conversion
        else if (text.match(/^```$/)) {
            e.preventDefault();
            transformBlock(element.closest('.block-container'), 'code');
            matched = true;
        }
        
        if (matched) {
            // Clear the markdown syntax
            element.textContent = '';
        }
    }
}

// --- Improved Drag and Drop Logic ---
function handleDragStart(e) {
    draggedItem = e.target.closest('.block-container');
    if (!draggedItem) return;

    // Add dragging style effect with animation
    setTimeout(() => {
        if(draggedItem) {
            draggedItem.classList.add('dragging');
            draggedItem.classList.add('shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
        }
    }, 0);

    // Set data transfer (required for Firefox)
    e.dataTransfer.setData('text/plain', draggedItem.id);
    e.dataTransfer.effectAllowed = 'move';

    // Create drop indicator line with improved styling
    if (!dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'drag-indicator h-1 bg-primary-500 rounded-full shadow-sm'; 
        dropIndicator.style.display = 'none';
        document.body.appendChild(dropIndicator);
    }
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem) return;

    e.dataTransfer.dropEffect = 'move';

    const targetItem = e.target.closest('.block-container');

    if (targetItem && targetItem !== draggedItem) {
         const rect = targetItem.getBoundingClientRect();
         const editorRect = editor.getBoundingClientRect();
         const midpoint = rect.top + rect.height / 2;

         // Calculate indicator position relative to the viewport
         let indicatorTop;
         if (e.clientY < midpoint) {
            // Place indicator above the target item
            indicatorTop = rect.top;
         } else {
            // Place indicator below the target item
            indicatorTop = rect.bottom;
         }

         // Position indicator with animation
         if (dropIndicator) {
            dropIndicator.style.display = 'block';
            dropIndicator.style.top = `${indicatorTop + window.scrollY - 2}px`; // -2 to center the indicator
            dropIndicator.style.left = `${editorRect.left + window.scrollX + 10}px`; // 10px indent for better visual
            dropIndicator.style.width = `${editorRect.width - 20}px`; // -20 for margins on both sides
            
            // Add animation effect
            dropIndicator.style.opacity = '1';
            dropIndicator.style.transform = 'scaleY(1)';
            dropIndicator.style.transition = 'opacity 150ms, transform 150ms';
         }

    } else if (targetItem === draggedItem) {
         // Hovering over the dragged item itself, hide indicator
         if (dropIndicator) {
            hideDropIndicator();
         }
    } else {
        // Hovering over empty space in the editor
        const lastBlock = editor.lastElementChild;
        if (lastBlock && e.clientY > lastBlock.getBoundingClientRect().bottom) {
             const editorRect = editor.getBoundingClientRect();
             if (dropIndicator) {
                dropIndicator.style.display = 'block';
                dropIndicator.style.top = `${lastBlock.getBoundingClientRect().bottom + window.scrollY - 2}px`;
                dropIndicator.style.left = `${editorRect.left + window.scrollX + 10}px`;
                dropIndicator.style.width = `${editorRect.width - 20}px`;
                
                // Add animation effect
                dropIndicator.style.opacity = '1';
                dropIndicator.style.transform = 'scaleY(1)';
                dropIndicator.style.transition = 'opacity 150ms, transform 150ms';
            }
        } else {
            hideDropIndicator();
        }
    }
}

function hideDropIndicator() {
    if (dropIndicator) {
        dropIndicator.style.opacity = '0';
        dropIndicator.style.transform = 'scaleY(0.5)';
        setTimeout(() => {
            dropIndicator.style.display = 'none';
        }, 150);
    }
}

function handleDragLeave(e) {
     // If leaving a potential drop target container, hide the indicator
     const relatedTarget = e.relatedTarget;
     const targetItem = e.target.closest('.block-container');
     // Hide if moving outside the editor area or not onto another block
     if (targetItem && (!relatedTarget || !targetItem.contains(relatedTarget))) {
        // Check carefully if leaving the editor area entirely
        const editorRect = editor.getBoundingClientRect();
        if (e.clientX < editorRect.left || e.clientX > editorRect.right || e.clientY < editorRect.top || e.clientY > editorRect.bottom) {
            hideDropIndicator();
        }
     }
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;

    // Hide drop indicator
    hideDropIndicator();

    const targetItem = e.target.closest('.block-container');

    if (targetItem && targetItem !== draggedItem) {
        // Determine drop position relative to target
        const rect = targetItem.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
            // Insert dragged item before target item
            editor.insertBefore(draggedItem, targetItem);
        } else {
            // Insert dragged item after target item
            editor.insertBefore(draggedItem, targetItem.nextSibling);
        }
    } else if (!targetItem) {
        // Dropped in empty space below last item?
        const lastBlock = editor.lastElementChild;
        if (lastBlock && e.clientY > lastBlock.getBoundingClientRect().bottom) {
            editor.appendChild(draggedItem);
        }
    }

    // Clean up dragging styles with animation
    draggedItem.classList.remove('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
    
    // Add highlight effect to show where the block was placed
    draggedItem.classList.add('bg-primary-50');
    setTimeout(() => {
        draggedItem.classList.remove('bg-primary-50');
    }, 800);
    
    draggedItem = null;
}

function handleDragEnd(e) {
    // Ensure cleanup happens even if drop fails or drag is cancelled
    if (draggedItem) {
        draggedItem.classList.remove('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
        draggedItem = null;
    }
    
    hideDropIndicator();
}

// Database-related functions
function createDatabase(dbConfig) {
    if (window.foundryAPI) {
        return window.foundryAPI.createDatabase(dbConfig);
    } else {
        // Fallback for when running without Electron
        console.log('Would create database:', dbConfig);
        // Simulate an API response
        return Promise.resolve({ 
            success: true, 
            id: 'db_' + Date.now(),
            message: 'Database created (simulated)'
        });
    }
}

function queryDatabase(dbId, query = {}) {
    if (window.foundryAPI) {
        return window.foundryAPI.queryDatabase(dbId, query);
    } else {
        // Fallback for when running without Electron
        console.log('Would query database:', dbId, query);
        // Simulate an API response with sample data
        return Promise.resolve({
            success: true,
            results: [
                { id: 1, name: 'Sample task 1', status: 'Done', assignee: 'John Doe', dueDate: '2023-07-01' },
                { id: 2, name: 'Sample task 2', status: 'In Progress', assignee: 'Jane Smith', dueDate: '2023-07-15' },
                { id: 3, name: 'Sample task 3', status: 'To Do', assignee: 'Alex Johnson', dueDate: '2023-07-30' }
            ],
            total: 3
        });
    }
}

// Expose key functions globally for use in HTML handlers
window.addBlock = addBlock;
window.transformBlock = transformBlock;
window.createDatabase = createDatabase;
window.queryDatabase = queryDatabase;

// Function to handle editing blocks via the edit button (improved styling)
function editBlock(blockContainer) {
    const blockType = blockContainer.classList.contains('todo-block-container') ? 'todo' :
                      blockContainer.querySelector('.heading-block') ? 'heading' :
                      blockContainer.querySelector('.list-block') ? 'list' :
                      blockContainer.querySelector('.quote-block') ? 'quote' :
                      blockContainer.querySelector('.code-block') ? 'code' : 'text';
    
    // Get current content
    let currentContent = '';
    let additionalData = {};
    
    if (blockType === 'todo') {
        currentContent = blockContainer.querySelector('.todo-text').textContent;
        additionalData.checked = blockContainer.querySelector('.todo-checkbox').checked;
    } else if (blockType === 'code') {
        currentContent = blockContainer.querySelector('.code-block').textContent;
        const languageSelector = blockContainer.querySelector('select');
        if (languageSelector) {
            additionalData.language = languageSelector.value;
        }
    } else {
        const editable = blockContainer.querySelector('.editable-block');
        if (editable) currentContent = editable.textContent;
    }
    
    // Create modal for editing with improved styling
    const modalHTML = `
    <div id="edit-block-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Edit ${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block</h3>
                <button id="close-edit-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Content</label>
                    ${blockType === 'code' ? 
                        `<textarea id="block-content-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" rows="8">${currentContent}</textarea>` :
                        `<textarea id="block-content-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows="4">${currentContent}</textarea>`
                    }
                </div>
                
                ${blockType === 'code' ? `
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Language</label>
                    <select id="code-language-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                        <option value="javascript" ${additionalData.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
                        <option value="python" ${additionalData.language === 'python' ? 'selected' : ''}>Python</option>
                        <option value="html" ${additionalData.language === 'html' ? 'selected' : ''}>HTML</option>
                        <option value="css" ${additionalData.language === 'css' ? 'selected' : ''}>CSS</option>
                        <option value="json" ${additionalData.language === 'json' ? 'selected' : ''}>JSON</option>
                        <option value="bash" ${additionalData.language === 'bash' ? 'selected' : ''}>Bash</option>
                    </select>
                </div>
                ` : ''}
                
                ${blockType === 'todo' ? `
                <div class="flex items-center p-3 bg-surface-50 rounded-lg">
                    <input type="checkbox" id="todo-checked-edit" class="todo-checkbox mr-3" ${additionalData.checked ? 'checked' : ''}>
                    <label for="todo-checked-edit" class="text-sm font-medium text-surface-700">Completed</label>
                </div>
                ` : ''}
                
                <div class="pt-4 flex justify-between">
                    <div>
                        <label class="block text-sm font-medium text-surface-700 mb-2">Block Type</label>
                        <select id="block-type-edit" class="px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                            <option value="text" ${blockType === 'text' ? 'selected' : ''}>Text</option>
                            <option value="heading" ${blockType === 'heading' ? 'selected' : ''}>Heading</option>
                            <option value="todo" ${blockType === 'todo' ? 'selected' : ''}>To-Do</option>
                            <option value="list" ${blockType === 'list' ? 'selected' : ''}>List</option>
                            <option value="quote" ${blockType === 'quote' ? 'selected' : ''}>Quote</option>
                            <option value="code" ${blockType === 'code' ? 'selected' : ''}>Code</option>
                        </select>
                    </div>
                    
                    <div class="flex items-end space-x-3">
                        <button id="edit-cancel-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
                            Cancel
                        </button>
                        <button id="edit-save-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    const modal = document.getElementById('edit-block-modal');
    
    // Animate in
    setTimeout(() => {
        modal.classList.add('opacity-100');
        const modalContent = modal.querySelector('div > div');
        if (modalContent) modalContent.classList.add('scale-100');
    }, 10);
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Add event listeners
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        closeEditModal();
    });
    
    document.getElementById('edit-cancel-btn').addEventListener('click', () => {
        closeEditModal();
    });
    
    document.getElementById('edit-save-btn').addEventListener('click', () => {
        const newContent = document.getElementById('block-content-edit').value;
        const newType = document.getElementById('block-type-edit').value;
        
        // Get additional data based on block type
        let newAdditionalData = {};
        
        if (newType === 'code' && document.getElementById('code-language-edit')) {
            newAdditionalData.language = document.getElementById('code-language-edit').value;
        }
        
        if (newType === 'todo' && document.getElementById('todo-checked-edit')) {
            newAdditionalData.checked = document.getElementById('todo-checked-edit').checked;
        }
        
        // If type changed, transform the block
        if (newType !== blockType) {
            // Create a new block of the desired type
            const newBlock = createBlockElement(newType, newContent);
            
            // Apply additional data if needed
            if (newType === 'todo' && newAdditionalData.checked) {
                const checkbox = newBlock.querySelector('.todo-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    newBlock.querySelector('.todo-text').classList.add('line-through');
                }
            } else if (newType === 'code' && newAdditionalData.language) {
                const languageSelector = newBlock.querySelector('select');
                if (languageSelector) {
                    languageSelector.value = newAdditionalData.language;
                }
            }
            
            // Replace the old block with the new one
            blockContainer.style.opacity = '0';
            blockContainer.style.transform = 'translateY(-10px)';
            blockContainer.style.transition = 'opacity 300ms, transform 300ms';
            
            setTimeout(() => {
                editor.replaceChild(newBlock, blockContainer);
            }, 300);
        } else {
            // Just update content without changing block type
            if (blockType === 'todo') {
                blockContainer.querySelector('.todo-text').textContent = newContent;
                const checkbox = blockContainer.querySelector('.todo-checkbox');
                checkbox.checked = newAdditionalData.checked;
                blockContainer.querySelector('.todo-text').classList.toggle('line-through', newAdditionalData.checked);
            } else if (blockType === 'code') {
                blockContainer.querySelector('.code-block').textContent = newContent;
                const languageSelector = blockContainer.querySelector('select');
                if (languageSelector && newAdditionalData.language) {
                    languageSelector.value = newAdditionalData.language;
                }
            } else {
                const editable = blockContainer.querySelector('.editable-block');
                if (editable) editable.textContent = newContent;
            }
            
            // Add a highlight effect to show the block was updated
            blockContainer.classList.add('bg-primary-50');
            setTimeout(() => {
                blockContainer.classList.remove('bg-primary-50');
            }, 800);
        }
        
        closeEditModal();
    });
    
    // Focus the content field
    setTimeout(() => {
        document.getElementById('block-content-edit').focus();
    }, 300);
    
    // Helper function to close the modal with animation
    function closeEditModal() {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        
        const modalContent = modal.querySelector('div > div');
        if (modalContent) {
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
        }
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
} 