/**
 * page-editor.js - Centralized module for page editing functionality
 * 
 * This module brings together all functionality related to the page editor,
 * centralizing the logic that was previously scattered across multiple files.
 */

import { createBlockElement, addBlock, showBlockMenu, hideBlockMenu } from './blocks.js';
import { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } from './drag-drop.js';
import { saveCurrentDocument } from './document.js';
import { showNotification } from '../utils/notifications.js';

// Track editor state
let currentEditor = null;
let blockIdCounter = 0;
let isEditorInitialized = false;

// Named handler functions for easier removal
const prismaticEffectHandler = createPrismaticEffect;
const scrollEffectHandler = handleScrollEffects;
const keydownHandler = handleKeyboardShortcuts;
const animationEndHandler = handleAnimationEnd;

/**
 * Initialize the page editor
 * @param {HTMLElement} editorElement - The editor container element
 */
export function initializePageEditor(editorElement) {
    if (!editorElement) {
        console.error('Editor element not found');
        return;
    }
    
    // Clean up existing listeners if editor was previously initialized
    cleanupEventListeners();
    
    currentEditor = editorElement;
    isEditorInitialized = true;
    
    // Apply glass effect to the editor
    applyGlassEffect(editorElement);
    
    // Set up auto-save
    setupAutoSave();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Set up placeholder block if editor is empty
    if (editorElement.children.length === 0) {
        const initialBlock = createBlockElement('text', '');
        editorElement.appendChild(initialBlock);
        
        // Focus the initial block
        setTimeout(() => {
            const editable = initialBlock.querySelector('[contenteditable=true]');
            if (editable) editable.focus();
        }, 0);
    }
    
    // Set up scroll animations
    setupScrollEffects();
    
    console.log('Page editor initialized with glass effects');
}

/**
 * Clean up event listeners when needed
 */
function cleanupEventListeners() {
    if (currentEditor) {
        currentEditor.removeEventListener('animationend', animationEndHandler);
        currentEditor.removeEventListener('mousemove', prismaticEffectHandler);
        window.removeEventListener('scroll', scrollEffectHandler);
        document.removeEventListener('keydown', keydownHandler);
        
        // Remove autosave listeners
        if (currentEditor._autoSaveInputHandler) {
            currentEditor.removeEventListener('input', currentEditor._autoSaveInputHandler);
        }
        if (currentEditor._autoSaveBlurHandler) {
            currentEditor.removeEventListener('blur', currentEditor._autoSaveBlurHandler);
        }
    }
}

/**
 * Apply glass effect to editor and its elements
 * @param {HTMLElement} editor - The editor container element
 */
function applyGlassEffect(editor) {
    // Add subtle shadow to enhance glass effect
    editor.style.boxShadow = '0 8px 32px rgba(14, 165, 233, 0.1)';
    
    // Remove any existing listener before adding new one
    editor.removeEventListener('animationend', animationEndHandler);
    // Add animation end handler
    editor.addEventListener('animationend', animationEndHandler);
    
    // Add glass effect to existing blocks
    const existingBlocks = editor.querySelectorAll('.block-container');
    existingBlocks.forEach(block => {
        enhanceBlockWithGlassEffect(block);
    });
    
    // Remove any existing mousemove listener before adding new one
    editor.removeEventListener('mousemove', prismaticEffectHandler);
    // Add prismatic light effect to the editor on mouse move
    editor.addEventListener('mousemove', prismaticEffectHandler);
}

/**
 * Handle animation end events
 * @param {AnimationEvent} e - Animation end event
 */
function handleAnimationEnd(e) {
    if (e.target.classList.contains('block-container') && e.target.classList.contains('new-block')) {
        e.target.classList.remove('new-block');
    }
}

/**
 * Add prismatic light effect as cursor moves
 * @param {MouseEvent} e - Mouse move event
 */
function createPrismaticEffect(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    // Create temporary highlight for blocks near the cursor
    const blocks = document.querySelectorAll('.block-container');
    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        // Calculate angle for prismatic effect
        const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
        
        // Apply subtle highlight based on distance and angle
        if (distance < 300) {
            const intensity = Math.max(0, 1 - distance / 300) * 0.15; // Max 15% intensity
            block.style.boxShadow = `0 5px 15px rgba(14, 165, 233, ${intensity})`;
            block.style.borderColor = `rgba(14, 165, 233, ${intensity})`;
            block.style.background = `linear-gradient(${angle}deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, ${0.25 + intensity}) 50%, rgba(255, 255, 255, 0.25) 100%)`;
        } else {
            block.style.boxShadow = '';
            block.style.borderColor = '';
            block.style.background = '';
        }
    });
}

/**
 * Enhance a block with glass effect styling
 * @param {HTMLElement} block - The block container element
 */
function enhanceBlockWithGlassEffect(block) {
    // Add base glass styles if not already present
    if (!block.dataset.glassEffectApplied) {
        block.dataset.glassEffectApplied = 'true';
        block.style.backdropFilter = 'blur(3px)';
        block.style.transition = 'all 0.3s var(--ease-out-expo)';
    }
}

/**
 * Set up smooth scroll effects
 */
function setupScrollEffects() {
    if (!currentEditor) return;
    
    // Remove any existing scroll listener before adding new one
    window.removeEventListener('scroll', scrollEffectHandler);
    // Add scroll-based effects 
    window.addEventListener('scroll', scrollEffectHandler, { passive: true });
}

/**
 * Handle scroll effects for blocks
 */
function handleScrollEffects() {
    if (!currentEditor) return;
    
    const scrollTop = window.scrollY;
    const blocks = currentEditor.querySelectorAll('.block-container');
    
    blocks.forEach((block, index) => {
        const rect = block.getBoundingClientRect();
        const offsetTop = rect.top + scrollTop;
        
        // Skip if block is not in viewport
        if (offsetTop > scrollTop + window.innerHeight || offsetTop + rect.height < scrollTop) {
            return;
        }
        
        // Calculate how far the block is from the center of the viewport
        const viewportCenter = scrollTop + window.innerHeight / 2;
        const blockCenter = offsetTop + rect.height / 2;
        const distanceFromCenter = Math.abs(viewportCenter - blockCenter);
        const maxDistance = window.innerHeight / 2;
        const distanceRatio = 1 - Math.min(distanceFromCenter / maxDistance, 1);
        
        // Apply subtle scale and opacity based on position
        const scale = 0.98 + (distanceRatio * 0.02);
        const opacity = 0.85 + (distanceRatio * 0.15);
        
        block.style.transform = `scale(${scale})`;
        block.style.opacity = opacity;
    });
}

/**
 * Setup autosave functionality
 */
function setupAutoSave() {
    if (!currentEditor) return;
    
    // Remove any existing listeners
    if (currentEditor._autoSaveInputHandler) {
        currentEditor.removeEventListener('input', currentEditor._autoSaveInputHandler);
    }
    if (currentEditor._autoSaveBlurHandler) {
        currentEditor.removeEventListener('blur', currentEditor._autoSaveBlurHandler);
    }
    
    // Debounced save function
    let saveTimeout = null;
    const debouncedSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentDocument(true); // Silent save
        }, 2000); // 2 second debounce
    };
    
    // Store references to handlers for future cleanup
    currentEditor._autoSaveInputHandler = debouncedSave;
    currentEditor._autoSaveBlurHandler = () => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveCurrentDocument(true);
        }
    };
    
    // Listen for content changes
    currentEditor.addEventListener('input', currentEditor._autoSaveInputHandler);
    currentEditor.addEventListener('blur', currentEditor._autoSaveBlurHandler);
}

/**
 * Setup keyboard shortcuts for the editor
 */
function setupKeyboardShortcuts() {
    // Remove any existing keydown listener before adding new one
    document.removeEventListener('keydown', keydownHandler);
    // Add keyboard shortcut handler
    document.addEventListener('keydown', keydownHandler);
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyboardShortcuts(e) {
    // Only process if editor is initialized and focused
    if (!isEditorInitialized || !isEditorFocused()) return;
    
    // Save shortcut: Ctrl/Cmd + S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentDocument();
        showNotification('Document saved', 'success');
    }
    
    // New block shortcut: Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addBlock('text');
    }
    
    // Handle markdown shortcuts
    handleMarkdownShortcuts(e);
}

/**
 * Check if the editor or any of its editable elements is currently focused
 * @returns {boolean} True if editor is focused
 */
function isEditorFocused() {
    if (!currentEditor) return false;
    
    const activeElement = document.activeElement;
    return currentEditor.contains(activeElement) && 
           (activeElement.contentEditable === 'true' || 
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA');
}

/**
 * Handle markdown shortcuts for formatting
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleMarkdownShortcuts(e) {
    // Only process in contenteditable elements
    if (!e.target.contentEditable || e.target.contentEditable !== 'true') return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const blockContainer = e.target.closest('.block-container');
    if (!blockContainer) return;
    
    // Get current text before cursor
    const textBeforeCursor = e.target.textContent.substring(0, selection.anchorOffset);
    
    // Handle heading shortcut: # + space
    if (e.key === ' ' && textBeforeCursor.trim() === '#') {
        e.preventDefault();
        
        // Clear the "#" and transform to heading
        e.target.textContent = '';
        transformBlock(blockContainer, 'heading');
        return;
    }
    
    // Handle todo shortcut: [] + space or [ ] + space
    if (e.key === ' ' && (textBeforeCursor.trim() === '[]' || textBeforeCursor.trim() === '[ ]')) {
        e.preventDefault();
        
        // Clear the "[]" and transform to todo
        e.target.textContent = '';
        transformBlock(blockContainer, 'todo');
        return;
    }
    
    // Handle quote shortcut: > + space
    if (e.key === ' ' && textBeforeCursor.trim() === '>') {
        e.preventDefault();
        
        // Clear the ">" and transform to quote
        e.target.textContent = '';
        transformBlock(blockContainer, 'quote');
        return;
    }
    
    // Handle list shortcut: - + space or * + space
    if (e.key === ' ' && (textBeforeCursor.trim() === '-' || textBeforeCursor.trim() === '*')) {
        e.preventDefault();
        
        // Clear the "-" or "*" and transform to list
        e.target.textContent = '';
        transformBlock(blockContainer, 'list');
        return;
    }
    
    // Handle code shortcut: ``` + space
    if (e.key === ' ' && textBeforeCursor.trim() === '```') {
        e.preventDefault();
        
        // Clear the "```" and transform to code
        e.target.textContent = '';
        transformBlock(blockContainer, 'code');
        return;
    }
}

/**
 * Transform a block from one type to another
 * @param {HTMLElement} blockContainer - The block container element
 * @param {string} newType - The new block type
 */
export function transformBlock(blockContainer, newType) {
    if (!blockContainer) return;
    
    // Get current content
    let content = '';
    const currentType = blockContainer.dataset.blockType || 'text';
    
    // Extract content based on current type
    if (currentType === 'todo') {
        content = blockContainer.querySelector('.todo-text')?.textContent || '';
    } else {
        content = blockContainer.querySelector('.editable-block')?.textContent || '';
    }
    
    // Create new block of desired type
    const newBlock = createBlockElement(newType, content);
    
    // Add animation class
    newBlock.classList.add('transform-block-animation');
    
    // Apply glass effect to the new block
    enhanceBlockWithGlassEffect(newBlock);
    
    // Replace old block with new one
    blockContainer.parentNode.replaceChild(newBlock, blockContainer);
    
    // Focus the new block
    setTimeout(() => {
        const editable = newBlock.querySelector('[contentEditable=true]');
        if (editable) {
            editable.focus();
            
            // Place cursor at end
            const range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        // Remove animation class after transition
        setTimeout(() => {
            newBlock.classList.remove('transform-block-animation');
        }, 300);
    }, 0);
}

/**
 * Create a new empty document
 */
export function createNewEmptyDocument() {
    if (!currentEditor) return;
    
    // Clear editor
    currentEditor.innerHTML = '';
    
    // Add initial block
    const initialBlock = createBlockElement('text', '');
    initialBlock.classList.add('new-block');
    
    // Apply glass effect to the initial block
    enhanceBlockWithGlassEffect(initialBlock);
    
    currentEditor.appendChild(initialBlock);
    
    // Focus the initial block
    setTimeout(() => {
        const editable = initialBlock.querySelector('[contenteditable=true]');
        if (editable) editable.focus();
    }, 0);
}

/**
 * Get the content of the editor in a structured format
 * @returns {Array} Array of block objects with type and content
 */
export function getEditorContent() {
    console.log('%c[EDITOR] getEditorContent called', 'background: #3b82f6; color: white; padding: 2px 4px; border-radius: 4px;');
    const editor = document.getElementById('editor');
    if (!editor) {
        console.warn('[EDITOR] Editor element not found');
        return [];
    }
    
    const blocks = editor.querySelectorAll('.block-container');
    console.log(`[EDITOR] Found ${blocks.length} blocks in editor`);
    
    // If no blocks are found, check if we might need to create at least an empty one
    if (blocks.length === 0 && editor.innerHTML.trim() !== '') {
        console.warn('[EDITOR] No blocks found but editor has content - may need to fix structure');
        
        // Return at least an empty text block to preserve the document
        return [{
            id: `block_${Date.now()}_0`,
            type: 'text',
            content: editor.textContent || '',
            position: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }];
    }
    
    const content = [];
    
    blocks.forEach((block, index) => {
        let blockType = block.dataset.blockType || 'text';
        let blockContent = '';
        let blockData = {};
        
        console.log(`[EDITOR] Processing block ${index + 1}/${blocks.length}, type: ${blockType}`);
        
        try {
            // Get content based on block type
            if (blockType === 'todo') {
                // For todo blocks, get text content from the todo-text element
                const todoText = block.querySelector('.todo-text');
                if (todoText) {
                    blockContent = todoText.textContent;
                    // Save checkbox state
                    blockData.checked = block.querySelector('.todo-checkbox')?.checked || false;
                }
            } else if (blockType === 'list') {
                // For lists, gather items
                const items = block.querySelectorAll('li');
                if (items && items.length > 0) {
                    blockContent = Array.from(items).map(item => item.textContent).join('\n');
                    console.log(`[EDITOR] List block with ${items.length} items`);
                }
            } else if (blockType === 'database') {
                // For database blocks, content is in the dataset
                blockContent = block.dataset.query || '';
                // Save database ID
                blockData.databaseId = block.dataset.databaseId;
            } else if (blockType === 'image') {
                // Save image src
                blockData.src = block.querySelector('img')?.src || '';
                blockData.alt = block.querySelector('img')?.alt || '';
                blockContent = block.querySelector('.image-caption')?.textContent || '';
            } else {
                // For text, heading, quote, code blocks - get content from editable element
                const editable = block.querySelector('[contenteditable=true]');
                if (editable) {
                    blockContent = editable.textContent;
                    console.log(`[EDITOR] ${blockType} block content: "${blockContent.substring(0, 30)}${blockContent.length > 30 ? '...' : ''}"`);
                } else {
                    console.warn(`[EDITOR] Could not find editable element for ${blockType} block`);
                }
                
                // For code blocks, save language selection
                if (blockType === 'code') {
                    blockData.language = block.querySelector('select')?.value || 'plain';
                }
            }
            
            // Create the block object with position, id and metadata
            const blockObj = {
                id: block.id || `block_${Date.now()}_${content.length}`,
                type: blockType,
                content: blockContent,
                position: content.length,
                ...blockData,
                // Preserve existing metadata if present
                createdAt: block.dataset.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            content.push(blockObj);
            console.log(`[EDITOR] Added block to content array: ${blockType}, content length: ${blockContent.length}`);
        } catch (error) {
            console.error(`[EDITOR] Error processing block ${index}:`, error);
            // Add a minimal representation to avoid losing the block entirely
            content.push({
                id: block.id || `block_${Date.now()}_${content.length}`,
                type: blockType,
                content: block.textContent || '',
                position: content.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    });
    
    console.log(`[EDITOR] Returning ${content.length} blocks from getEditorContent`);
    return content;
}

/**
 * Clean up resources when editor is destroyed
 */
export function destroyPageEditor() {
    cleanupEventListeners();
    currentEditor = null;
    isEditorInitialized = false;
}

// Re-export block functions for convenience
export { 
    createBlockElement, 
    addBlock, 
    showBlockMenu, 
    hideBlockMenu,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
}; 