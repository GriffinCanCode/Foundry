/**
 * optimizer-integration.js - Integration of performance optimization utilities
 *
 * This file integrates the optimizer utilities throughout the frontend codebase,
 * applying performance optimizations based on the guidelines in optimizer_docs.
 */

import {
  debounce,
  throttle,
  memoize,
  batchDOM,
  runWhenIdle,
  delegateEvent,
  FastDOM,
  Cache,
} from "./optimizer.js";

// Cache for frequently accessed data
export const documentCache = new Cache(20);
export const databaseCache = new Cache(10);

// Export optimized versions of common functions for use throughout the app
export const createOptimizedHandlers = () => {
  return {
    // Throttled drag-and-drop handlers
    throttledDragOver: throttle(function (e) {
      e.preventDefault(); // Necessary to allow dropping

      const draggedItem = this.draggedItem;
      if (!draggedItem) return;

      e.dataTransfer.dropEffect = "move";

      const targetItem = e.target.closest(".block-container");
      const editor = document.getElementById("editor");
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
        const dropIndicator = this.dropIndicator;
        if (dropIndicator) {
          dropIndicator.style.display = "block";
          dropIndicator.style.top = `${indicatorTop + window.scrollY - 2}px`; // -2 to center the indicator
          dropIndicator.style.left = `${
            editorRect.left + window.scrollX + 10
          }px`; // 10px indent for better visual
          dropIndicator.style.width = `${editorRect.width - 20}px`; // -20 for margins on both sides

          // Add animation effect
          dropIndicator.style.opacity = "1";
          dropIndicator.style.transform = "scaleY(1)";
          dropIndicator.style.transition = "opacity 150ms, transform 150ms";
        }
      } else if (targetItem === draggedItem) {
        // Hovering over the dragged item itself, hide indicator
        if (this.dropIndicator) {
          this.hideDropIndicator();
        }
      } else {
        // Hovering over empty space in the editor
        const lastBlock = editor.lastElementChild;
        if (lastBlock && e.clientY > lastBlock.getBoundingClientRect().bottom) {
          const editorRect = editor.getBoundingClientRect();
          if (this.dropIndicator) {
            this.dropIndicator.style.display = "block";
            this.dropIndicator.style.top = `${
              lastBlock.getBoundingClientRect().bottom + window.scrollY - 2
            }px`;
            this.dropIndicator.style.left = `${
              editorRect.left + window.scrollX + 10
            }px`;
            this.dropIndicator.style.width = `${editorRect.width - 20}px`;

            // Add animation effect
            this.dropIndicator.style.opacity = "1";
            this.dropIndicator.style.transform = "scaleY(1)";
            this.dropIndicator.style.transition =
              "opacity 150ms, transform 150ms";
          }
        } else {
          this.hideDropIndicator();
        }
      }
    }, 30), // 30ms throttle for smoother drag operation

    // Debounced resize handler
    debouncedResizeHandler: debounce((sidebar, main) => {
      if (window.innerWidth >= 768) {
        // Auto-show sidebar on desktop
        if (sidebar && !sidebar.classList.contains("open")) {
          sidebar.classList.add("open");
          if (main) main.classList.remove("sidebar-closed");
        }
      } else {
        // Auto-hide sidebar on mobile
        if (sidebar && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
          if (main) main.classList.add("sidebar-closed");
        }
      }
    }, 200), // 200ms debounce time for resize events

    // Memoized function for calculating database statistics
    memoizedDatabaseStats: memoize((databaseId) => {
      // This is a placeholder for the actual database stats calculation function
      // The real implementation would query the database and calculate stats
      console.log(`Calculating stats for database ${databaseId}`);
      return {
        totalRecords: Math.floor(Math.random() * 1000),
        averageSize: Math.floor(Math.random() * 100),
        categories: ["Category A", "Category B", "Category C"],
      };
    }),

    // Function to batch create multiple blocks at once
    batchCreateBlocks: (blockDataArray, containerElement) => {
      batchDOM.add(() => {
        const blockElements = blockDataArray.map((blockData) => {
          return FastDOM.createElement(
            "div",
            {
              className: `block-container ${blockData.type}-block-container group relative transition-all duration-200 hover:bg-surface-50 rounded-lg p-3`,
              draggable: true,
              id: `block-${blockData.id || Date.now()}`,
            },
            blockData.content
          );
        });

        FastDOM.appendChildren(containerElement, blockElements);
      });
    },

    // Use FastDOM to efficiently create block elements
    createBlockFast: (type, content = "") => {
      // This is a simplified version that would be expanded based on block type
      return FastDOM.createElement(
        "div",
        {
          className: `block-container ${type}-block-container group relative transition-all duration-200 hover:bg-surface-50 rounded-lg p-3`,
          draggable: true,
          id: `block-${Date.now()}`,
        },
        content
      );
    },
  };
};

// Setup optimized event delegation for blocks
export function setupOptimizedEventHandlers() {
  const editor = document.getElementById("editor");
  if (!editor) return;

  // Use event delegation for block controls instead of individual listeners
  delegateEvent(editor, "click", ".edit-block-btn", function (event) {
    const blockContainer = this.closest(".block-container");
    if (blockContainer) {
      // Import this dynamically to avoid circular dependencies
      import("../modules/blocks.js").then((module) => {
        module.editBlock(blockContainer);
      });
    }
  });

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

  // Add the 'once' event listener for first-time editor interaction
  import("../utils/optimizer.js").then((module) => {
    module.once(editor, "focus", () => {
      // Run non-critical initialization code during idle time
      runWhenIdle(() => {
        loadNonCriticalEditorFeatures();
      });
    });
  });
}

// Function to load non-critical editor features during idle time
function loadNonCriticalEditorFeatures() {
  console.log("Loading non-critical editor features during idle time");

  // Load additional editor features that aren't needed immediately
  // Example: syntax highlighting, advanced formatting tools, etc.
  import("../modules/editor-extensions.js")
    .then((module) => {
      module.initializeExtensions();
    })
    .catch((error) => {
      console.warn(
        "Failed to load editor extensions (this is expected if the module doesn't exist yet)",
        error
      );
    });
}

// Initialize optimizer integration
export function initializeOptimizerIntegration() {
  console.log("Initializing performance optimizations");
  setupOptimizedEventHandlers();

  // Replace frequent calculations with memoized versions
  patchCalculationFunctions();
}

// Patch calculation-heavy functions with memoized versions
function patchCalculationFunctions() {
  // This function would replace expensive calculations throughout the app
  // with memoized versions from the optimizer utilities
  // Example: We could monkey-patch or replace specific global functions
  // if (window.calculateDatabaseStats) {
  //   const originalFunc = window.calculateDatabaseStats;
  //   window.calculateDatabaseStats = memoize(originalFunc);
  // }
}
