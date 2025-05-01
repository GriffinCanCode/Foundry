const editor = document.getElementById('editor');
let blockIdCounter = 0; // Simple counter for unique IDs
let draggedItem = null;
let dropIndicator = null; // Reference to the visual indicator line

// Function to create a new block element
function createBlockElement(type, content = '') {
    const blockContainer = document.createElement('div');
    // Base classes for container
    blockContainer.className = 'block-container group relative'; // Added relative for indicator positioning
    blockContainer.id = `block-${blockIdCounter++}`;
    blockContainer.draggable = true; // Make the container draggable

    // --- Event Listeners for Drag & Drop ---
    blockContainer.addEventListener('dragstart', handleDragStart);
    blockContainer.addEventListener('dragover', handleDragOver);
    blockContainer.addEventListener('dragleave', handleDragLeave); // Added to remove indicator
    blockContainer.addEventListener('drop', handleDrop);
    blockContainer.addEventListener('dragend', handleDragEnd);

    // --- Drag Handle ---
    const controls = document.createElement('div');
    controls.className = 'block-controls'; // Styles defined in CSS
    controls.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
        </svg>
    `;
    // Prevent handle from interfering with text selection/editing
    controls.addEventListener('mousedown', (e) => e.preventDefault());
    blockContainer.appendChild(controls);

    // Add options menu button
    const blockOptions = document.createElement('div');
    blockOptions.className = 'block-options opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1';
    blockOptions.innerHTML = `
        <button class="edit-block-btn p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
        </button>
        <button class="delete-block-btn p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100">
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
    
    // Add delete handler
    blockOptions.querySelector('.delete-block-btn').addEventListener('click', () => {
        if (confirm('Delete this block?')) {
            blockContainer.remove();
        }
    });
    
    blockContainer.appendChild(blockOptions);

    // --- Block Content based on Type ---
    let blockElement; // The actual editable element or specific structure

    switch (type) {
        case 'heading':
            blockElement = document.createElement('h2');
            // Apply base editable and specific heading styles
            blockElement.className = 'editable-block heading-block';
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
            checkbox.className = 'todo-checkbox'; // Apply custom checkbox styles

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
            blockElement.className = 'editable-block list-block pl-5 list-disc';
            
            const listItem = document.createElement('li');
            listItem.contentEditable = true;
            listItem.textContent = content || 'List item';
            
            blockElement.appendChild(listItem);
            blockContainer.appendChild(blockElement);
            
            // Handle enter key to create new list items
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
            blockElement.className = 'editable-block quote-block pl-4 border-l-4 border-gray-300 italic text-gray-700';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Quote';
            blockElement.textContent = content;
            blockContainer.appendChild(blockElement);
            break;

        case 'code':
            blockContainer.classList.add('code-block-container');
            
            // Create a code container with pre and code elements
            const preElement = document.createElement('pre');
            preElement.className = 'bg-gray-100 rounded-md p-3 overflow-x-auto';
            
            blockElement = document.createElement('code');
            blockElement.className = 'editable-block code-block text-sm font-mono';
            blockElement.contentEditable = true;
            blockElement.dataset.placeholder = 'Code';
            blockElement.textContent = content;
            
            preElement.appendChild(blockElement);
            blockContainer.appendChild(preElement);
            
            // Add language selector
            const languageSelector = document.createElement('select');
            languageSelector.className = 'absolute right-2 top-2 text-xs bg-gray-200 border-none rounded';
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
            
            // Create a database reference block
            const dbWrapper = document.createElement('div');
            dbWrapper.className = 'border border-gray-200 rounded-md p-4';
            
            const dbHeader = document.createElement('div');
            dbHeader.className = 'flex items-center justify-between mb-3';
            
            const dbTitle = document.createElement('h3');
            dbTitle.className = 'font-medium text-gray-800 flex items-center';
            dbTitle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                ${content || 'Database'}
            `;
            
            const dbControls = document.createElement('div');
            dbControls.className = 'flex space-x-2';
            dbControls.innerHTML = `
                <button class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">View</button>
                <button class="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded">Properties</button>
            `;
            
            dbHeader.appendChild(dbTitle);
            dbHeader.appendChild(dbControls);
            
            const dbPreview = document.createElement('div');
            dbPreview.className = 'text-sm text-gray-500';
            dbPreview.innerHTML = 'Click "View" to open database';
            
            dbWrapper.appendChild(dbHeader);
            dbWrapper.appendChild(dbPreview);
            blockContainer.appendChild(dbWrapper);
            
            // Handle database view button click
            dbControls.querySelector('button').addEventListener('click', () => {
                // Toggle the sample database view for demonstration
                const sampleDB = document.getElementById('sample-database');
                if (sampleDB) {
                    sampleDB.style.display = sampleDB.style.display === 'none' ? 'block' : 'none';
                }
            });
            break;

        case 'text':
        default: // Default to text block
            blockElement = document.createElement('p');
            // Apply base editable and specific text styles
            blockElement.className = 'editable-block text-block';
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
                }
            }
            
            // Implement slash commands
            if (e.key === '/' && (editableElement.textContent.trim() === '' || 
                                 window.getSelection().anchorOffset === 0)) {
                e.preventDefault();
                showSlashCommandMenu(blockContainer);
            }
        });
    }

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

// Transform a block from one type to another
function transformBlock(blockContainer, newType) {
    // Get the content from the current block
    let content = '';
    const currentType = blockContainer.classList.contains('todo-block-container') ? 'todo' :
                      blockContainer.querySelector('.heading-block') ? 'heading' :
                      blockContainer.querySelector('.list-block') ? 'list' :
                      blockContainer.querySelector('.quote-block') ? 'quote' :
                      blockContainer.querySelector('.code-block') ? 'code' : 'text';
    
    // Extract content based on the block type
    if (currentType === 'todo') {
        content = blockContainer.querySelector('.todo-text').textContent;
    } else {
        const editable = blockContainer.querySelector('[contenteditable=true]');
        if (editable) content = editable.textContent;
    }
    
    // Create a new block of the desired type
    const newBlock = createBlockElement(newType, content);
    
    // Replace the old block with the new one
    editor.replaceChild(newBlock, blockContainer);
    
    // Focus the new block
    const newEditable = newBlock.querySelector('[contenteditable=true]');
    if (newEditable) {
        newEditable.focus();
    }
}

// Function to add a new block to the editor
function addBlock(type, content = '') {
    const newBlock = createBlockElement(type, content);
    editor.appendChild(newBlock);
    // Focus the new block's editable area
    const editable = newBlock.querySelector('[contenteditable=true]');
    if (editable) {
        // Small delay to ensure element is fully in DOM for focus
        setTimeout(() => editable.focus(), 0);
    }
}

// --- Drag and Drop Logic ---
function handleDragStart(e) {
    draggedItem = e.target.closest('.block-container');
    if (!draggedItem) return;

    // Add dragging style effect after a short delay
    setTimeout(() => {
        if(draggedItem) draggedItem.classList.add('dragging');
    }, 0);

    // Set data transfer (required for Firefox)
    e.dataTransfer.setData('text/plain', draggedItem.id);
    e.dataTransfer.effectAllowed = 'move';

     // Create drop indicator line
    if (!dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'drag-indicator'; // Style defined in CSS
        // Initially hide it or position it off-screen
        dropIndicator.style.display = 'none';
        document.body.appendChild(dropIndicator); // Append to body to avoid container clipping issues
    }
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem) return;

    e.dataTransfer.dropEffect = 'move';

    const targetItem = e.target.closest('.block-container');

    if (targetItem && targetItem !== draggedItem) {
         const rect = targetItem.getBoundingClientRect();
         const editorRect = editor.getBoundingClientRect(); // Get editor bounds
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

         // Position indicator absolutely within viewport, aligning with editor left edge
         if (dropIndicator) {
            dropIndicator.style.display = 'block';
            dropIndicator.style.top = `${indicatorTop + window.scrollY - 1}px`; // Adjust for scrolling, -1 for line thickness
            dropIndicator.style.left = `${editorRect.left + window.scrollX}px`; // Align with editor left
            dropIndicator.style.width = `${editorRect.width}px`; // Match editor width
         }

    } else if (targetItem === draggedItem) {
         // Hovering over the dragged item itself, hide indicator
         if (dropIndicator) dropIndicator.style.display = 'none';
    } else {
        // Hovering over empty space in the editor? Maybe place at bottom.
        // This needs more refinement based on desired behavior in gaps.
        // For now, hide if not over a valid target.
        // if (dropIndicator) dropIndicator.style.display = 'none';
        // Or, attempt to place at end if hovering below last element
        const lastBlock = editor.lastElementChild;
        if (lastBlock && e.clientY > lastBlock.getBoundingClientRect().bottom) {
             const editorRect = editor.getBoundingClientRect();
             if (dropIndicator) {
                dropIndicator.style.display = 'block';
                dropIndicator.style.top = `${lastBlock.getBoundingClientRect().bottom + window.scrollY - 1}px`;
                dropIndicator.style.left = `${editorRect.left + window.scrollX}px`;
                dropIndicator.style.width = `${editorRect.width}px`;
            }
        } else {
             if (dropIndicator) dropIndicator.style.display = 'none';
        }
    }
}

function handleDragLeave(e) {
     // If leaving a potential drop target container, hide the indicator
     // This prevents the indicator from sticking if mouse moves out quickly
     const relatedTarget = e.relatedTarget;
     const targetItem = e.target.closest('.block-container');
     // Hide if moving outside the editor area or not onto another block
     if (targetItem && (!relatedTarget || !targetItem.contains(relatedTarget))) {
        // Check carefully if leaving the editor area entirely
        const editorRect = editor.getBoundingClientRect();
        if (e.clientX < editorRect.left || e.clientX > editorRect.right || e.clientY < editorRect.top || e.clientY > editorRect.bottom) {
            if (dropIndicator) dropIndicator.style.display = 'none';
        }
     }
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;

    // Hide and remove the drop indicator
    if (dropIndicator) {
        dropIndicator.style.display = 'none';
    }

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
         // Handle other empty space drop scenarios if needed
    }
    // else: Dropped on itself, do nothing

    // Clean up dragging styles immediately
    draggedItem.classList.remove('dragging');
    draggedItem = null;
}

 function handleDragEnd(e) {
    // Ensure cleanup happens even if drop fails or drag is cancelled
    if (draggedItem) { // Check if it wasn't reset by a successful drop
         draggedItem.classList.remove('dragging');
         draggedItem = null;
    }
     if (dropIndicator) {
        dropIndicator.style.display = 'none';
    }
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

// Function to handle editing blocks via the edit button
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
    
    // Create modal for editing
    const modalHTML = `
    <div id="edit-block-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Edit ${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block</h3>
                <button id="close-edit-modal" class="p-1 rounded hover:bg-gray-100">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    ${blockType === 'code' ? 
                        `<textarea id="block-content-edit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono" rows="8">${currentContent}</textarea>` :
                        `<textarea id="block-content-edit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="4">${currentContent}</textarea>`
                    }
                </div>
                
                ${blockType === 'code' ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select id="code-language-edit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
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
                <div class="flex items-center">
                    <input type="checkbox" id="todo-checked-edit" class="mr-2" ${additionalData.checked ? 'checked' : ''}>
                    <label for="todo-checked-edit" class="text-sm font-medium text-gray-700">Completed</label>
                </div>
                ` : ''}
                
                <div class="pt-3 flex justify-between">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Block Type</label>
                        <select id="block-type-edit" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="text" ${blockType === 'text' ? 'selected' : ''}>Text</option>
                            <option value="heading" ${blockType === 'heading' ? 'selected' : ''}>Heading</option>
                            <option value="todo" ${blockType === 'todo' ? 'selected' : ''}>To-Do</option>
                            <option value="list" ${blockType === 'list' ? 'selected' : ''}>List</option>
                            <option value="quote" ${blockType === 'quote' ? 'selected' : ''}>Quote</option>
                            <option value="code" ${blockType === 'code' ? 'selected' : ''}>Code</option>
                        </select>
                    </div>
                    
                    <div class="flex items-end">
                        <button id="edit-cancel-btn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2">
                            Cancel
                        </button>
                        <button id="edit-save-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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
    
    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Add event listeners
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        document.getElementById('edit-block-modal').remove();
    });
    
    document.getElementById('edit-cancel-btn').addEventListener('click', () => {
        document.getElementById('edit-block-modal').remove();
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
            editor.replaceChild(newBlock, blockContainer);
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
        }
        
        document.getElementById('edit-block-modal').remove();
    });
}

// Add block creation function that adds a new block at a specific position
function insertBlockAfter(referenceBlock, type, content = '') {
    const newBlock = createBlockElement(type, content);
    if (referenceBlock.nextSibling) {
        editor.insertBefore(newBlock, referenceBlock.nextSibling);
    } else {
        editor.appendChild(newBlock);
    }
    
    // Focus the new block's editable area
    const editable = newBlock.querySelector('[contenteditable=true]');
    if (editable) {
        setTimeout(() => editable.focus(), 0);
    }
    
    return newBlock;
}

// Slash command menu for enhanced block creation
function showSlashCommandMenu(blockContainer) {
    // Position of the current block for menu placement
    const rect = blockContainer.getBoundingClientRect();
    
    // Create menu HTML
    const menuHTML = `
    <div id="slash-menu" class="absolute bg-white rounded-md shadow-lg border border-gray-200 z-50 w-64">
        <div class="p-2">
            <input type="text" id="slash-search" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Search commands...">
        </div>
        <ul class="max-h-60 overflow-y-auto">
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="text">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">📝</span>
                    <div>
                        <div class="font-medium">Text</div>
                        <div class="text-xs text-gray-500">Regular paragraph</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="heading">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">🔤</span>
                    <div>
                        <div class="font-medium">Heading</div>
                        <div class="text-xs text-gray-500">Section heading</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="todo">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">✅</span>
                    <div>
                        <div class="font-medium">To-Do</div>
                        <div class="text-xs text-gray-500">Task with checkbox</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="list">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">•</span>
                    <div>
                        <div class="font-medium">Bullet List</div>
                        <div class="text-xs text-gray-500">Simple bulleted list</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="quote">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">💬</span>
                    <div>
                        <div class="font-medium">Quote</div>
                        <div class="text-xs text-gray-500">Cited or quoted text</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="code">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">{ }</span>
                    <div>
                        <div class="font-medium">Code Block</div>
                        <div class="text-xs text-gray-500">Technical code snippet</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-2 hover:bg-gray-100 cursor-pointer" data-type="database">
                <div class="flex items-center">
                    <span class="w-5 h-5 mr-2 text-gray-500">🗄️</span>
                    <div>
                        <div class="font-medium">Database</div>
                        <div class="text-xs text-gray-500">Link to a database</div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
    `;
    
    // Create and add the menu to the document
    const menuContainer = document.createElement('div');
    menuContainer.innerHTML = menuHTML;
    const menu = menuContainer.firstElementChild;
    document.body.appendChild(menu);
    
    // Position the menu below the current block
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    
    // Focus the search input
    const searchInput = document.getElementById('slash-search');
    if (searchInput) {
        searchInput.focus();
        
        // Filter items as user types
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const items = document.querySelectorAll('.slash-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Handle keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                
                const items = Array.from(document.querySelectorAll('.slash-item')).filter(
                    item => item.style.display !== 'none'
                );
                
                if (items.length === 0) return;
                
                const activeItem = document.querySelector('.slash-item.active');
                let nextItem;
                
                if (!activeItem) {
                    // Select first or last item depending on arrow direction
                    nextItem = e.key === 'ArrowDown' ? items[0] : items[items.length - 1];
                } else {
                    // Find current index
                    const currentIndex = items.indexOf(activeItem);
                    if (e.key === 'ArrowDown') {
                        nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : items[0];
                    } else {
                        nextItem = currentIndex > 0 ? items[currentIndex - 1] : items[items.length - 1];
                    }
                    
                    activeItem.classList.remove('active');
                }
                
                nextItem.classList.add('active');
                nextItem.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                
                const activeItem = document.querySelector('.slash-item.active');
                if (activeItem) {
                    // Select the active item
                    const blockType = activeItem.getAttribute('data-type');
                    selectBlockType(blockType, blockContainer);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideSlashMenu();
            }
        });
    }
    
    // Add click handlers for items
    document.querySelectorAll('.slash-item').forEach(item => {
        item.addEventListener('click', () => {
            const blockType = item.getAttribute('data-type');
            selectBlockType(blockType, blockContainer);
        });
    });
    
    // Add global click handler to close the menu
    document.addEventListener('click', handleOutsideClick);
    
    function handleOutsideClick(e) {
        if (!menu.contains(e.target) && e.target !== blockContainer) {
            hideSlashMenu();
        }
    }
    
    function hideSlashMenu() {
        document.removeEventListener('click', handleOutsideClick);
        menu.remove();
    }
    
    function selectBlockType(type, container) {
        if (type === 'database') {
            addDatabaseBlock();
        } else {
            // Replace the current block with the new type or transform it
            transformBlock(container, type);
        }
        
        hideSlashMenu();
    }
} 