/**
 * blocks.js - Block creation and management
 */

import {
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
} from "./drag-drop.js";
import { showNotification } from "../utils/notifications.js";
import { FastDOM, delegateEvent, batchDOM } from "../utils/optimizer.js";

let blockIdCounter = 0; // Simple counter for unique IDs
let dropIndicator = null; // Reference to the visual indicator line
let eventDelegationInitialized = false; // Track if we've set up delegation

// Function to create a new block element with enhanced styling and optimized DOM operations
export function createBlockElement(type, content = "") {
  console.log(`[BLOCKS] Creating ${type} block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}"`);
  
  // Create base block container with all needed attributes in one operation
  const blockId = `block-${blockIdCounter++}`;
  const blockContainer = FastDOM.createElement("div", {
    className: `block-container ${type}-block-container group relative transition-all duration-200 hover:bg-surface-50 rounded-lg p-3`,
    id: blockId,
    draggable: true,
    dataset: {
      blockType: type,
    },
    // Add drag event listeners directly in creation
    ondragstart: handleDragStart,
    ondragover: handleDragOver,
    ondragleave: handleDragLeave,
    ondrop: handleDrop,
    ondragend: handleDragEnd,
  });

  // Set up event delegation for block controls if not already done
  if (!eventDelegationInitialized) {
    setupBlockEventDelegation();
  }

  // --- Create all components with FastDOM ---

  // --- Create Drag Handle ---
  const controls = FastDOM.createElement("div", {
    className:
      "block-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200",
    innerHTML: `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-surface-400">
              <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
        `,
    onmousedown: (e) => e.preventDefault(), // Prevent handle from interfering with text selection
  });

  // --- Create Block Options ---
  const blockOptions = FastDOM.createElement("div", {
    className:
      "block-options opacity-0 group-hover:opacity-100 transition-opacity duration-200",
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
        `,
  });

  // Create block content based on type
  let blockElement; // The actual editable element or specific structure

  switch (type) {
    case "heading":
      blockElement = FastDOM.createElement("h2", {
        className:
          "editable-block heading-block font-display font-semibold text-2xl",
        contentEditable: true,
        dataset: { placeholder: "Heading" }
      });
      
      // Explicitly set the content after element creation
      blockElement.textContent = content || "";
      
      console.log(`[BLOCKS] Created heading block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}", element content: "${blockElement.textContent}"`);
      break;

    case "todo":
      // To-do uses a different structure with checkbox and text
      FastDOM.setStyles(blockContainer, { paddingLeft: "30px" });

      // Create checkbox
      const checkbox = FastDOM.createElement("input", {
        type: "checkbox",
        className: "todo-checkbox",
        onchange: (e) => {
          const textSpan = blockContainer.querySelector(".todo-text");
          if (textSpan) {
            textSpan.classList.toggle("line-through", e.target.checked);
          }
        },
      });

      // Create editable text span
      const textSpan = FastDOM.createElement("span", {
        className: "editable-block todo-text",
        contentEditable: true,
        dataset: { placeholder: "To-do item" }
      });
      
      // Explicitly set the content after element creation
      textSpan.textContent = content || "";
      
      console.log(`[BLOCKS] Created todo block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}", element content: "${textSpan.textContent}"`);

      // Use DocumentFragment for adding multiple children efficiently
      const todoFragment = document.createDocumentFragment();
      todoFragment.appendChild(checkbox);
      todoFragment.appendChild(textSpan);

      // Append both elements to container
      blockElement = todoFragment;
      break;

    case "list":
      // Create list with first item
      blockElement = FastDOM.createElement("ul", {
        className: "editable-block list-block pl-5 list-disc space-y-1",
      });

      const listItem = FastDOM.createElement("li", {
        contentEditable: true,
        textContent: content || "List item",
      });

      blockElement.appendChild(listItem);

      // Handle enter key to create new list items
      blockElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const newItem = document.createElement("li");
          newItem.contentEditable = true;

          // Get selection and current list item
          const selection = window.getSelection();
          const currentItem =
            selection.anchorNode.nodeType === 3
              ? selection.anchorNode.parentNode
              : selection.anchorNode;

          // Split text at cursor if needed
          if (selection.anchorOffset < currentItem.textContent.length) {
            const remainingText = currentItem.textContent.substring(
              selection.anchorOffset
            );
            currentItem.textContent = currentItem.textContent.substring(
              0,
              selection.anchorOffset
            );
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

    case "quote":
      blockElement = FastDOM.createElement("blockquote", {
        className:
          "editable-block quote-block pl-4 border-l-4 border-primary-300 italic text-surface-700",
        contentEditable: true,
        dataset: { placeholder: "Quote" }
      });
      
      // Explicitly set the content after element creation
      blockElement.textContent = content || "";
      
      console.log(`[BLOCKS] Created quote block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}", element content: "${blockElement.textContent}"`);
      break;

    case "code":
      // Create code block with pre and code elements
      const preElement = FastDOM.createElement("pre", {
        className: "bg-surface-100 rounded-lg p-4 overflow-x-auto",
        style: { position: "relative" },
      });

      const codeElement = FastDOM.createElement("code", {
        className: "editable-block code-block text-sm font-mono",
        contentEditable: true,
        dataset: { placeholder: "Code" }
      });
      
      // Explicitly set the content after element creation
      codeElement.textContent = content || "";
      
      console.log(`[BLOCKS] Created code block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}", element content: "${codeElement.textContent}"`);

      const languageSelector = FastDOM.createElement("select", {
        className:
          "absolute right-3 top-3 text-xs bg-surface-200 hover:bg-surface-300 transition-colors border-none rounded-md px-2 py-1",
        innerHTML: `
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash</option>
                `,
      });

      preElement.appendChild(codeElement);
      preElement.appendChild(languageSelector);
      blockElement = preElement;
      break;

    case "database":
      // Create database reference block
      const dbWrapper = FastDOM.createElement("div", {
        className: "border border-surface-200 rounded-lg p-4 bg-surface-50",
      });

      const dbHeader = FastDOM.createElement("div", {
        className: "flex items-center justify-between mb-3",
      });

      const dbTitle = FastDOM.createElement("h3", {
        className: "font-medium text-surface-800 flex items-center",
        innerHTML: `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 text-primary-500">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                    ${content || "Database"}
                `,
      });

      const dbControls = FastDOM.createElement("div", {
        className: "flex space-x-2",
        innerHTML: `
                    <button class="px-3 py-1.5 text-xs bg-primary-50 text-primary-600 font-medium rounded-md hover:bg-primary-100 transition-colors">View</button>
                    <button class="px-3 py-1.5 text-xs bg-surface-100 text-surface-700 font-medium rounded-md hover:bg-surface-200 transition-colors">Properties</button>
                `,
      });

      const dbPreview = FastDOM.createElement("div", {
        className: "text-sm text-surface-500",
        innerHTML: 'Click "View" to open database',
      });

      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      dbHeader.appendChild(dbTitle);
      dbHeader.appendChild(dbControls);
      fragment.appendChild(dbHeader);
      fragment.appendChild(dbPreview);
      dbWrapper.appendChild(fragment);

      // Add click handler for view button
      dbControls.querySelector("button").addEventListener("click", () => {
        // Toggle the sample database view for demonstration
        const sampleDB = document.getElementById("sample-database");
        if (sampleDB) {
          if (sampleDB.style.display === "none") {
            sampleDB.style.opacity = "0";
            sampleDB.style.display = "block";
            setTimeout(() => {
              sampleDB.style.opacity = "1";
              sampleDB.style.transition = "opacity 300ms";
            }, 10);
          } else {
            sampleDB.style.opacity = "0";
            sampleDB.style.transition = "opacity 300ms";
            setTimeout(() => {
              sampleDB.style.display = "none";
            }, 300);
          }
        }
      });

      blockElement = dbWrapper;
      break;

    case "text":
    default: // Default to text block
      blockElement = FastDOM.createElement("p", {
        className: "editable-block text-block text-surface-800 leading-relaxed",
        contentEditable: true,
        dataset: { placeholder: "Type / for commands or start typing..." }
      });
      
      // Explicitly set the content after element creation
      blockElement.textContent = content || "";
      
      console.log(`[BLOCKS] Created text block with content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}", length: ${content?.length}, element content: "${blockElement.textContent}"`);

      // Add support for markdown-style formatting
      blockElement.addEventListener("keydown", handleMarkdownShortcuts);
      break;
  }

  // Build the final block structure using batch operations
  batchDOM.add(() => {
    // Append controls and options to the container
    blockContainer.appendChild(controls);
    blockContainer.appendChild(blockOptions);

    // Append the main block element
    if (blockElement instanceof DocumentFragment) {
      blockContainer.appendChild(blockElement);
    } else {
      blockContainer.appendChild(blockElement);
    }
  });

  // Add key handler for block transformation and navigation
  const editableElement =
    type === "todo"
      ? blockContainer.querySelector(".todo-text")
      : blockContainer.querySelector("[contenteditable=true]");

  if (editableElement) {
    editableElement.addEventListener("keydown", (e) => {
      // Enter key creates a new block below
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        type !== "list" &&
        type !== "code"
      ) {
        // Lists handle their own Enter key
        e.preventDefault();

        // Create a new text block after this one
        const newBlock = insertBlockAfter(blockContainer, "text");

        // Focus the new block
        const newEditable = newBlock.querySelector("[contenteditable=true]");
        if (newEditable) {
          newEditable.focus();
        }
      }

      // Backspace on empty block removes it
      if (e.key === "Backspace" && editableElement.textContent.trim() === "") {
        const editor = document.getElementById("editor");
        if (editor && editor.children.length > 1) {
          // Don't remove the last block
          e.preventDefault();

          // Find the previous block to focus after removal
          const prevBlock = blockContainer.previousElementSibling;

          // Animate block removal
          blockContainer.style.opacity = "0";
          blockContainer.style.transform = "translateY(-10px)";
          blockContainer.style.transition = "opacity 300ms, transform 300ms";

          setTimeout(() => {
            blockContainer.remove();

            if (prevBlock) {
              const prevEditable = prevBlock.querySelector(
                "[contenteditable=true]"
              );
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
      if (
        e.key === "/" &&
        (editableElement.textContent.trim() === "" ||
          window.getSelection().anchorOffset === 0)
      ) {
        // Block-level slash command is now handled globally in event-listeners.js
        // This block-level handler is kept for backward compatibility
        // but we'll let the event bubble up to be handled by the global listener
        console.log(
          "Block-level slash command detected, letting global handler process it"
        );
        // Don't call preventDefault() here to allow event to bubble up to global handler
        // Don't call showSlashCommandMenu directly to avoid duplicate menus
      }
    });
  }

  // Add entrance animation for new blocks
  blockContainer.style.opacity = "0";
  blockContainer.style.transform = "translateY(10px)";

  setTimeout(() => {
    blockContainer.style.opacity = "1";
    blockContainer.style.transform = "translateY(0)";
    blockContainer.style.transition = "opacity 300ms, transform 300ms";
  }, 10);

  return blockContainer; // Return the fully constructed container
}

// Setup event delegation for block controls instead of adding listeners to each block
function setupBlockEventDelegation() {
  const editor = document.getElementById("editor");
  if (!editor) return;

  // Use event delegation for edit button
  delegateEvent(editor, "click", ".edit-block-btn", function (event) {
    const blockContainer = this.closest(".block-container");
    if (blockContainer) {
      editBlock(blockContainer);
    }
  });

  // Use event delegation for delete button
  delegateEvent(editor, "click", ".delete-block-btn", function (event) {
    const blockContainer = this.closest(".block-container");
    if (blockContainer) {
      const confirmDelete = confirm("Delete this block?");
      if (confirmDelete) {
        // Apply delete animation
        blockContainer.style.opacity = "0";
        blockContainer.style.transform = "translateY(-10px)";
        blockContainer.style.transition = "opacity 300ms, transform 300ms";

        setTimeout(() => {
          blockContainer.remove();
        }, 300);
      }
    }
  });

  eventDelegationInitialized = true;
}

// Handle markdown shortcuts
function handleMarkdownShortcuts(e) {
  const element = e.target;

  // Detect common markdown patterns and convert them
  if (e.key === " ") {
    const text = element.textContent;
    let matched = false;

    // Heading conversion
    if (text.match(/^#\s$/)) {
      e.preventDefault();
      transformBlock(element.closest(".block-container"), "heading");
      matched = true;
    }
    // To-do conversion
    else if (text.match(/^\[\]\s$/)) {
      e.preventDefault();
      transformBlock(element.closest(".block-container"), "todo");
      matched = true;
    }
    // List conversion
    else if (text.match(/^-\s$/)) {
      e.preventDefault();
      transformBlock(element.closest(".block-container"), "list");
      matched = true;
    }
    // Quote conversion
    else if (text.match(/^>\s$/)) {
      e.preventDefault();
      transformBlock(element.closest(".block-container"), "quote");
      matched = true;
    }
    // Code conversion
    else if (text.match(/^```$/)) {
      e.preventDefault();
      transformBlock(element.closest(".block-container"), "code");
      matched = true;
    }

    if (matched) {
      // Clear the markdown syntax
      element.textContent = "";
    }
  }
}

// Transform a block from one type to another
export function transformBlock(blockContainer, newType) {
  // Get the content from the current block
  let content = "";
  const currentType = blockContainer.classList.contains("todo-block-container")
    ? "todo"
    : blockContainer.querySelector(".heading-block")
    ? "heading"
    : blockContainer.querySelector(".list-block")
    ? "list"
    : blockContainer.querySelector(".quote-block")
    ? "quote"
    : blockContainer.querySelector(".code-block")
    ? "code"
    : "text";

  // Extract content based on the block type
  if (currentType === "todo") {
    content = blockContainer.querySelector(".todo-text").textContent;
  } else {
    const editable = blockContainer.querySelector("[contenteditable=true]");
    if (editable) content = editable.textContent;
  }

  // Create a new block of the desired type
  const newBlock = createBlockElement(newType, content);

  // Replace the old block with the new one
  const editor = document.getElementById("editor");
  if (editor) {
    editor.replaceChild(newBlock, blockContainer);
  }

  // Focus the new block
  const newEditable = newBlock.querySelector("[contenteditable=true]");
  if (newEditable) {
    newEditable.focus();
  }
}

// Function to add a new block to the editor
export function addBlock(type, content = "") {
  const editor = document.getElementById("editor");
  if (!editor) return null;

  const newBlock = createBlockElement(type, content);
  editor.appendChild(newBlock);

  // Focus the new block's editable area
  const editable = newBlock.querySelector("[contenteditable=true]");
  if (editable) {
    // Small delay to ensure element is fully in DOM for focus
    setTimeout(() => editable.focus(), 0);
  }

  return newBlock;
}

// Function to handle editing blocks via the edit button
export function editBlock(blockContainer) {
  const blockType = blockContainer.classList.contains("todo-block-container")
    ? "todo"
    : blockContainer.querySelector(".heading-block")
    ? "heading"
    : blockContainer.querySelector(".list-block")
    ? "list"
    : blockContainer.querySelector(".quote-block")
    ? "quote"
    : blockContainer.querySelector(".code-block")
    ? "code"
    : "text";

  // Get current content
  let currentContent = "";
  let additionalData = {};

  if (blockType === "todo") {
    currentContent = blockContainer.querySelector(".todo-text").textContent;
    additionalData.checked =
      blockContainer.querySelector(".todo-checkbox").checked;
  } else if (blockType === "code") {
    currentContent = blockContainer.querySelector(".code-block").textContent;
    const languageSelector = blockContainer.querySelector("select");
    if (languageSelector) {
      additionalData.language = languageSelector.value;
    }
  } else {
    const editable = blockContainer.querySelector(".editable-block");
    if (editable) currentContent = editable.textContent;
  }

  // Create modal for editing with improved styling
  const modalHTML = `
    <div id="edit-block-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Edit ${
                  blockType.charAt(0).toUpperCase() + blockType.slice(1)
                } Block</h3>
                <button id="close-edit-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Content</label>
                    ${
                      blockType === "code"
                        ? `<textarea id="block-content-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" rows="8">${currentContent}</textarea>`
                        : `<textarea id="block-content-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows="4">${currentContent}</textarea>`
                    }
                </div>
                
                ${
                  blockType === "code"
                    ? `
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Language</label>
                    <select id="code-language-edit" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                        <option value="javascript" ${
                          additionalData.language === "javascript"
                            ? "selected"
                            : ""
                        }>JavaScript</option>
                        <option value="python" ${
                          additionalData.language === "python" ? "selected" : ""
                        }>Python</option>
                        <option value="html" ${
                          additionalData.language === "html" ? "selected" : ""
                        }>HTML</option>
                        <option value="css" ${
                          additionalData.language === "css" ? "selected" : ""
                        }>CSS</option>
                        <option value="json" ${
                          additionalData.language === "json" ? "selected" : ""
                        }>JSON</option>
                        <option value="bash" ${
                          additionalData.language === "bash" ? "selected" : ""
                        }>Bash</option>
                    </select>
                </div>
                `
                    : ""
                }
                
                ${
                  blockType === "todo"
                    ? `
                <div class="flex items-center p-3 bg-surface-50 rounded-lg">
                    <input type="checkbox" id="todo-checked-edit" class="todo-checkbox mr-3" ${
                      additionalData.checked ? "checked" : ""
                    }>
                    <label for="todo-checked-edit" class="text-sm font-medium text-surface-700">Completed</label>
                </div>
                `
                    : ""
                }
                
                <div class="pt-4 flex justify-between">
                    <div>
                        <label class="block text-sm font-medium text-surface-700 mb-2">Block Type</label>
                        <select id="block-type-edit" class="px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                            <option value="text" ${
                              blockType === "text" ? "selected" : ""
                            }>Text</option>
                            <option value="heading" ${
                              blockType === "heading" ? "selected" : ""
                            }>Heading</option>
                            <option value="todo" ${
                              blockType === "todo" ? "selected" : ""
                            }>To-Do</option>
                            <option value="list" ${
                              blockType === "list" ? "selected" : ""
                            }>List</option>
                            <option value="quote" ${
                              blockType === "quote" ? "selected" : ""
                            }>Quote</option>
                            <option value="code" ${
                              blockType === "code" ? "selected" : ""
                            }>Code</option>
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
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  const modal = document.getElementById("edit-block-modal");

  // Animate in
  setTimeout(() => {
    modal.classList.add("opacity-100");
    const modalContent = modal.querySelector("div > div");
    if (modalContent) modalContent.classList.add("scale-100");
  }, 10);

  // Initialize icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Add event listeners
  document.getElementById("close-edit-modal").addEventListener("click", () => {
    closeEditModal();
  });

  document.getElementById("edit-cancel-btn").addEventListener("click", () => {
    closeEditModal();
  });

  document.getElementById("edit-save-btn").addEventListener("click", () => {
    const newContent = document.getElementById("block-content-edit").value;
    const newType = document.getElementById("block-type-edit").value;

    // Get additional data based on block type
    let newAdditionalData = {};

    if (newType === "code" && document.getElementById("code-language-edit")) {
      newAdditionalData.language =
        document.getElementById("code-language-edit").value;
    }

    if (newType === "todo" && document.getElementById("todo-checked-edit")) {
      newAdditionalData.checked =
        document.getElementById("todo-checked-edit").checked;
    }

    // If type changed, transform the block
    if (newType !== blockType) {
      // Create a new block of the desired type
      const newBlock = createBlockElement(newType, newContent);

      // Apply additional data if needed
      if (newType === "todo" && newAdditionalData.checked) {
        const checkbox = newBlock.querySelector(".todo-checkbox");
        if (checkbox) {
          checkbox.checked = true;
          newBlock.querySelector(".todo-text").classList.add("line-through");
        }
      } else if (newType === "code" && newAdditionalData.language) {
        const languageSelector = newBlock.querySelector("select");
        if (languageSelector) {
          languageSelector.value = newAdditionalData.language;
        }
      }

      // Replace the old block with the new one
      blockContainer.style.opacity = "0";
      blockContainer.style.transform = "translateY(-10px)";
      blockContainer.style.transition = "opacity 300ms, transform 300ms";

      setTimeout(() => {
        const editor = document.getElementById("editor");
        if (editor) {
          editor.replaceChild(newBlock, blockContainer);
        }
      }, 300);
    } else {
      // Just update content without changing block type
      if (blockType === "todo") {
        blockContainer.querySelector(".todo-text").textContent = newContent;
        const checkbox = blockContainer.querySelector(".todo-checkbox");
        checkbox.checked = newAdditionalData.checked;
        blockContainer
          .querySelector(".todo-text")
          .classList.toggle("line-through", newAdditionalData.checked);
      } else if (blockType === "code") {
        blockContainer.querySelector(".code-block").textContent = newContent;
        const languageSelector = blockContainer.querySelector("select");
        if (languageSelector && newAdditionalData.language) {
          languageSelector.value = newAdditionalData.language;
        }
      } else {
        const editable = blockContainer.querySelector(".editable-block");
        if (editable) editable.textContent = newContent;
      }

      // Add a highlight effect to show the block was updated
      blockContainer.classList.add("bg-primary-50");
      setTimeout(() => {
        blockContainer.classList.remove("bg-primary-50");
      }, 800);
    }

    closeEditModal();
  });

  // Focus the content field
  setTimeout(() => {
    document.getElementById("block-content-edit").focus();
  }, 300);

  // Helper function to close the modal with animation
  function closeEditModal() {
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");

    const modalContent = modal.querySelector("div > div");
    if (modalContent) {
      modalContent.classList.remove("scale-100");
      modalContent.classList.add("scale-95");
    }

    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Slash command menu for enhanced block creation
export function showSlashCommandMenu(blockContainer) {
  // Remove any existing slash menu first
  const existingMenu = document.getElementById("slash-menu");
  if (existingMenu) {
    existingMenu.remove();
  }

  // Position of the current block for menu placement
  const rect = blockContainer.getBoundingClientRect();

  // Create menu HTML with improved styling
  const menuHTML = `
    <div id="slash-menu" class="absolute bg-white rounded-lg shadow-lg border border-surface-200 z-50 w-72 overflow-hidden opacity-0 transform scale-95 transition-all duration-200">
        <div class="p-3">
            <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input type="text" id="slash-search" class="w-full pl-10 px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Search commands...">
            </div>
        </div>
        <ul class="max-h-72 overflow-y-auto">
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="text">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">📝</span>
                    <div>
                        <div class="font-medium">Text</div>
                        <div class="text-xs text-surface-500">Regular paragraph</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="heading">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">🔤</span>
                    <div>
                        <div class="font-medium">Heading</div>
                        <div class="text-xs text-surface-500">Section heading</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="todo">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">✅</span>
                    <div>
                        <div class="font-medium">To-Do</div>
                        <div class="text-xs text-surface-500">Task with checkbox</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="list">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">•</span>
                    <div>
                        <div class="font-medium">Bullet List</div>
                        <div class="text-xs text-surface-500">Simple bulleted list</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="quote">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">💬</span>
                    <div>
                        <div class="font-medium">Quote</div>
                        <div class="text-xs text-surface-500">Cited or quoted text</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="code">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">{ }</span>
                    <div>
                        <div class="font-medium">Code Block</div>
                        <div class="text-xs text-surface-500">Technical code snippet</div>
                    </div>
                </div>
            </li>
            <li class="slash-item p-3 hover:bg-primary-50 cursor-pointer transition-colors" data-type="database">
                <div class="flex items-center">
                    <span class="w-8 h-8 mr-3 flex items-center justify-center rounded-lg bg-surface-100 text-surface-700">🗄️</span>
                    <div>
                        <div class="font-medium">Database</div>
                        <div class="text-xs text-surface-500">Link to a database</div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
    `;

  // Create and add the menu to the document
  const menuContainer = document.createElement("div");
  menuContainer.innerHTML = menuHTML;
  const menu = menuContainer.firstElementChild;
  document.body.appendChild(menu);

  // Position the menu using fixed positioning to avoid scroll issues
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + window.scrollY + 5}px`; // Adding 5px gap
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.zIndex = "9999"; // Ensure high z-index

  // Check if menu would go off-screen and adjust if needed
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  if (menuRect.right > viewportWidth) {
    menu.style.left = `${viewportWidth - menuRect.width - 10}px`;
  }

  // Animate in
  setTimeout(() => {
    menu.classList.remove("opacity-0", "scale-95");
    menu.classList.add("opacity-100", "scale-100");
  }, 10);

  // Focus the search input
  const searchInput = document.getElementById("slash-search");
  if (searchInput) {
    searchInput.focus();

    // Filter items as user types
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const items = document.querySelectorAll(".slash-item");

      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });

    // Handle keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        const items = Array.from(
          document.querySelectorAll(".slash-item")
        ).filter((item) => item.style.display !== "none");

        if (items.length === 0) return;

        const activeItem = document.querySelector(".slash-item.active");
        let nextItem;

        if (!activeItem) {
          // Select first or last item depending on arrow direction
          nextItem = e.key === "ArrowDown" ? items[0] : items[items.length - 1];
        } else {
          // Find current index
          const currentIndex = items.indexOf(activeItem);
          if (e.key === "ArrowDown") {
            nextItem =
              currentIndex < items.length - 1
                ? items[currentIndex + 1]
                : items[0];
          } else {
            nextItem =
              currentIndex > 0
                ? items[currentIndex - 1]
                : items[items.length - 1];
          }

          activeItem.classList.remove("active", "bg-primary-100");
        }

        nextItem.classList.add("active", "bg-primary-100");
        nextItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (e.key === "Enter") {
        e.preventDefault();

        // First look for active item
        let activeItem = document.querySelector(".slash-item.active");

        // If no active item, default to first visible item as fallback
        if (!activeItem) {
          const visibleItems = Array.from(
            document.querySelectorAll(".slash-item")
          ).filter((item) => item.style.display !== "none");
          if (visibleItems.length > 0) {
            activeItem = visibleItems[0];
          }
        }

        if (activeItem) {
          // Select the active item
          const blockType = activeItem.getAttribute("data-type");
          selectBlockType(blockType, blockContainer);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideSlashMenu();
      }
    });
  }

  // Add click handlers for items
  document.querySelectorAll(".slash-item").forEach((item) => {
    item.addEventListener("click", () => {
      const blockType = item.getAttribute("data-type");
      selectBlockType(blockType, blockContainer);
    });
  });

  // Add global click handler to close the menu
  document.addEventListener("click", handleOutsideClick);

  function handleOutsideClick(e) {
    // Check if the click is outside both the menu and the block container
    if (!menu.contains(e.target) && e.target !== blockContainer) {
      // Add small delay to prevent accidental closing
      setTimeout(() => {
        hideSlashMenu();
      }, 50);
    }
  }

  function hideSlashMenu() {
    menu.classList.remove("opacity-100", "scale-100");
    menu.classList.add("opacity-0", "scale-95");

    setTimeout(() => {
      document.removeEventListener("click", handleOutsideClick);
      menu.remove();
    }, 200);
  }

  function selectBlockType(type, container) {
    if (type === "database") {
      addDatabaseBlock();
    } else {
      // Replace the current block with the new type or transform it
      transformBlock(container, type);
    }

    hideSlashMenu();
  }
}

// Block menu functions
export function showBlockMenu() {
  const blockMenu = document.getElementById("block-menu");
  if (blockMenu) {
    blockMenu.classList.remove("hidden");
  }
}

export function hideBlockMenu() {
  const blockMenu = document.getElementById("block-menu");
  if (blockMenu) {
    blockMenu.classList.add("hidden");
  }
}

export function addDatabaseBlock() {
  // Add a database reference block to the editor
  const newBlock = createBlockElement("database", "Tasks");
  const editor = document.getElementById("editor");
  if (editor) {
    editor.appendChild(newBlock);
  }

  // Show the sample database
  const sampleDB = document.getElementById("sample-database");
  if (sampleDB) {
    sampleDB.style.display = "block";
  }
}

// Add block creation function that adds a new block at a specific position
export function insertBlockAfter(referenceBlock, type, content = "") {
  const newBlock = createBlockElement(type, content);
  const editor = document.getElementById("editor");

  if (editor) {
    if (referenceBlock.nextSibling) {
      editor.insertBefore(newBlock, referenceBlock.nextSibling);
    } else {
      editor.appendChild(newBlock);
    }
  }

  // Focus the new block's editable area
  const editable = newBlock.querySelector("[contenteditable=true]");
  if (editable) {
    setTimeout(() => editable.focus(), 0);
  }

  return newBlock;
}
