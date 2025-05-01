/**
 * drag-drop.js - Drag and drop functionality for editor blocks
 */

// State variables for drag and drop
let draggedItem = null;
let dropIndicator = null; // Reference to the visual indicator line

// --- Drag and Drop Logic ---
export function handleDragStart(e) {
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

export function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem) return;

    e.dataTransfer.dropEffect = 'move';

    const targetItem = e.target.closest('.block-container');
    const editor = document.getElementById('editor');
    if (!editor) return;

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

export function hideDropIndicator() {
    if (dropIndicator) {
        dropIndicator.style.opacity = '0';
        dropIndicator.style.transform = 'scaleY(0.5)';
        setTimeout(() => {
            dropIndicator.style.display = 'none';
        }, 150);
    }
}

export function handleDragLeave(e) {
     // If leaving a potential drop target container, hide the indicator
     const relatedTarget = e.relatedTarget;
     const targetItem = e.target.closest('.block-container');
     // Hide if moving outside the editor area or not onto another block
     if (targetItem && (!relatedTarget || !targetItem.contains(relatedTarget))) {
        // Check carefully if leaving the editor area entirely
        const editor = document.getElementById('editor');
        if (!editor) return;
        
        const editorRect = editor.getBoundingClientRect();
        if (e.clientX < editorRect.left || e.clientX > editorRect.right || 
            e.clientY < editorRect.top || e.clientY > editorRect.bottom) {
            hideDropIndicator();
        }
     }
}

export function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;

    // Hide drop indicator
    hideDropIndicator();

    const targetItem = e.target.closest('.block-container');
    const editor = document.getElementById('editor');
    if (!editor) return;

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

export function handleDragEnd(e) {
    // Ensure cleanup happens even if drop fails or drag is cancelled
    if (draggedItem) {
        draggedItem.classList.remove('dragging', 'shadow-md', 'bg-surface-100', 'opacity-75', 'scale-[0.98]');
        draggedItem = null;
    }
    
    hideDropIndicator();
} 