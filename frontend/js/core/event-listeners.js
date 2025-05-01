/**
 * event-listeners.js - Event listener setup and management
 */

import { appState } from "./app-core.js";
import { toggleSidebar } from "../modules/ui.js";
import {
  saveCurrentDocument,
  createNewDocument,
  exportCurrentDocument,
} from "../modules/document.js";
import { showWorkspaceSelection } from "../modules/workspace.js";
import { showShareDialog } from "../modules/dialogs.js";
import { showSettingsDialog } from "../modules/settings.js";
import { hideBlockMenu, showSlashCommandMenu } from "../modules/blocks.js";
import { createNewDatabase } from "../modules/database.js";
import { debounce, delegateEvent } from "../utils/optimizer.js";
import { showNotification } from "../utils/notifications.js";

// Define named handler functions for easier removal and reuse
const newPageHandler = () => {
  console.log("New page button clicked via delegation");
  import("../modules/document.js").then((module) => {
    module.createNewDocument();
  });
};

const workspaceSwitcherHandler = () => {
  console.log("Workspace switcher button clicked via delegation");
  import("../modules/workspace.js").then((module) => {
    module.showWorkspaceSelection();
  });
};

const saveDocumentHandler = () => saveCurrentDocument();
const shareButtonHandler = () => showShareDialog();
const settingsButtonHandler = () => showSettingsDialog();
const exportButtonHandler = () => exportCurrentDocument();

// Set up all event listeners with performance optimizations
export function setupEventListeners() {
  const sidebar = document.querySelector(".sidebar");
  const main = document.getElementById("main-content");

  // Set up sidebar button handlers
  setupSidebarButtons();

  // Set up toolbar button handlers
  setupToolbarButtons();

  // Individual event listeners for specific elements that need direct binding
  setupSpecificEventListeners();

  // Add debounced window resize handler for responsive sidebar behavior
  setupResponsiveLayout(sidebar, main);
}

/**
 * Set up sidebar button event handlers
 */
export function setupSidebarButtons() {
  const sidebarEl = document.querySelector(".sidebar");
  if (!sidebarEl) return;

  // Use proper event delegation with named handler functions
  delegateEvent(sidebarEl, "click", "#new-page-btn", newPageHandler);
  delegateEvent(
    sidebarEl,
    "click",
    "#workspace-switcher",
    workspaceSwitcherHandler
  );

  // For direct access to the workspace switcher button (if needed)
  const workspaceSwitcher = document.getElementById("workspace-switcher");
  if (workspaceSwitcher) {
    // Clear any direct onclick property to avoid conflicts
    workspaceSwitcher.onclick = null;
  }
}

/**
 * Set up toolbar button event handlers
 */
export function setupToolbarButtons() {
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar) return;

  // Use proper event delegation with named handler functions
  delegateEvent(toolbar, "click", "#save-document", saveDocumentHandler);
  delegateEvent(toolbar, "click", "#share-button", shareButtonHandler);
  delegateEvent(toolbar, "click", "#settings-button", settingsButtonHandler);
  delegateEvent(toolbar, "click", "#export-button", exportButtonHandler);
}

/**
 * Set up specific event listeners for elements that need direct binding
 */
function setupSpecificEventListeners() {
  // Block menu click outside to close
  const blockMenu = document.getElementById("block-menu");
  if (blockMenu) {
    const blockMenuClickHandler = (e) => {
      if (e.target === blockMenu) {
        hideBlockMenu();
      }
    };

    // Remove existing listener to prevent duplicates
    blockMenu.removeEventListener("click", blockMenuClickHandler);
    // Add new listener
    blockMenu.addEventListener("click", blockMenuClickHandler);
  }

  // Document title auto-save on blur
  const documentTitle = document.getElementById("document-title");
  if (documentTitle) {
    const titleBlurHandler = () => {
      if (appState.currentDocument) {
        saveCurrentDocument(true); // Silent save
      }
    };

    // Remove existing listener to prevent duplicates
    documentTitle.removeEventListener("blur", titleBlurHandler);
    // Add new listener
    documentTitle.addEventListener("blur", titleBlurHandler);
  }

  // Set up global keyboard shortcuts
  setupKeyboardShortcuts();
}

/**
 * Set up global keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  // Save shortcut (Ctrl+S / Cmd+S)
  const saveShortcutHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (appState.currentDocument) {
        saveCurrentDocument();
      }
    }
  };

  // Remove existing listener to prevent duplicates
  document.removeEventListener("keydown", saveShortcutHandler);
  // Add new listener
  document.addEventListener("keydown", saveShortcutHandler);

  // Slash command handler
  const slashCommandHandler = (e) => {
    if (
      e.key === "/" &&
      document.activeElement.getAttribute("contenteditable") === "true"
    ) {
      // Only trigger on editable elements like blocks
      const selection = window.getSelection();
      const anchorNode = selection.anchorNode;

      if (!anchorNode) return;

      // Find the current block container
      const blockContainer =
        anchorNode.nodeType === 3
          ? anchorNode.parentElement.closest(".block-container")
          : anchorNode.closest(".block-container");

      if (blockContainer) {
        const editableElement = blockContainer.querySelector(
          '[contenteditable="true"]'
        );
        if (
          editableElement &&
          (editableElement.textContent.trim() === "" ||
            selection.anchorOffset === 0)
        ) {
          e.preventDefault();
          console.log(
            "Global slash command triggered for block:",
            blockContainer
          );

          // Clear existing slash if needed
          if (editableElement.textContent === "/") {
            editableElement.textContent = "";
          }

          // Show the slash command menu
          showSlashCommandMenu(blockContainer);
        }
      }
    }
  };

  // Remove existing listener to prevent duplicates
  document.removeEventListener("keydown", slashCommandHandler);
  // Add new listener
  document.addEventListener("keydown", slashCommandHandler);
}

/**
 * Set up responsive layout behavior
 * @param {HTMLElement} sidebar - The sidebar element
 * @param {HTMLElement} main - The main content element
 */
function setupResponsiveLayout(sidebar, main) {
  // Create debounced handler
  const resizeHandler = debounce(() => {
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
  }, 200); // 200ms debounce time

  // Remove existing listener to prevent duplicates
  window.removeEventListener("resize", resizeHandler);
  // Add new listener
  window.addEventListener("resize", resizeHandler);
}
