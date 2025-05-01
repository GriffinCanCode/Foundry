/**
 * dialogs.js - Dialog window handling
 */

import { appState } from "../core/app-core.js";
import { closeModal } from "../utils/modals.js";
import { showNotification } from "../utils/notifications.js";
import { selectWorkspace } from "./workspace.js";
import { showSettingsDialog as showSettingsModal } from "./settings.js";

// Show dialog to create a new workspace
export function showCreateWorkspaceDialog() {
  // Create modal for creating a workspace
  const modalHTML = `
    <div id="create-workspace-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Create New Workspace</h3>
                <button id="close-workspace-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Workspace Name</label>
                    <input type="text" id="workspace-name" 
                           class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                           placeholder="My Workspace">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Description (Optional)</label>
                    <textarea id="workspace-description" 
                           class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                           placeholder="A short description of this workspace"></textarea>
                </div>
                
                <div class="pt-4 flex justify-end space-x-3">
                    <button id="workspace-cancel-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
                        Cancel
                    </button>
                    <button id="workspace-create-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Create
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

  // Add modal to the body
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  const modal = document.getElementById("create-workspace-modal");

  // Animate in
  setTimeout(() => {
    modal.classList.add("opacity-100");
    const modalContent = modal.querySelector("div > div");
    if (modalContent) modalContent.classList.add("scale-100");
  }, 10);

  // Initialize icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Add event listeners
  document
    .getElementById("close-workspace-modal")
    .addEventListener("click", () => {
      closeModal(modal);
    });

  document
    .getElementById("workspace-cancel-btn")
    .addEventListener("click", () => {
      closeModal(modal);
    });

  document
    .getElementById("workspace-create-btn")
    .addEventListener("click", () => {
      const workspaceName = document
        .getElementById("workspace-name")
        .value.trim();
      if (!workspaceName) {
        // Animate the input to show error
        const input = document.getElementById("workspace-name");
        input.classList.add("border-red-500", "ring-2", "ring-red-200");
        setTimeout(() => {
          input.classList.remove("border-red-500", "ring-2", "ring-red-200");
        }, 1000);
        return;
      }

      const description =
        document.getElementById("workspace-description")?.value.trim() || "";

      // Using dynamic import to avoid circular dependencies
      import("./workspace.js").then((module) => {
        module.createWorkspace(workspaceName, description);
      });

      closeModal(modal);
    });

  // Focus the input field
  setTimeout(() => {
    document.getElementById("workspace-name").focus();
  }, 300);
}

// Show dialog for sharing content
export function showShareDialog() {
  // Create modal for share options
  const modalHTML = `
    <div id="share-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Share Document</h3>
                <button id="close-share-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Link to this document</label>
                    <div class="flex">
                        <input type="text" value="foundry://${
                          appState.currentDocument?.id || "document"
                        }" 
                               class="flex-grow px-4 py-2.5 border border-surface-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-50" readonly>
                        <button id="copy-link-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 border border-l-0 border-surface-200 rounded-r-lg hover:bg-surface-200 transition-colors font-medium">
                            Copy
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Share with others</label>
                    <div class="flex">
                        <input type="email" placeholder="Enter email address" 
                               class="flex-grow px-4 py-2.5 border border-surface-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <button class="px-4 py-2.5 bg-primary-600 text-white border border-primary-600 rounded-r-lg hover:bg-primary-700 transition-colors font-medium">
                            Send
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Access permissions</label>
                    <select class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                        <option value="view">Can view</option>
                        <option value="comment">Can comment</option>
                        <option value="edit">Can edit</option>
                    </select>
                </div>
                
                <div class="pt-3 flex justify-end">
                    <button id="share-submit-btn" class="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                        Share
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

  // Add modal to the body
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  const modal = document.getElementById("share-modal");

  // Animate in
  setTimeout(() => {
    modal.classList.add("opacity-100");
    const modalContent = modal.querySelector("div > div");
    if (modalContent) modalContent.classList.add("scale-100");
  }, 10);

  // Initialize icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Add event listeners
  document.getElementById("close-share-modal").addEventListener("click", () => {
    closeModal(modal);
  });

  document.getElementById("copy-link-btn").addEventListener("click", (e) => {
    const linkInput = e.target.previousElementSibling;
    linkInput.select();
    document.execCommand("copy");

    // Change button text temporarily
    const originalText = e.target.innerHTML;
    e.target.innerHTML = "Copied!";
    e.target.classList.add(
      "bg-green-100",
      "text-green-700",
      "border-green-200"
    );

    setTimeout(() => {
      e.target.innerHTML = originalText;
      e.target.classList.remove(
        "bg-green-100",
        "text-green-700",
        "border-green-200"
      );
    }, 2000);

    showNotification("Link copied to clipboard", "success");
  });

  document.getElementById("share-submit-btn").addEventListener("click", () => {
    // In a real app, this would submit the share request to the backend
    showNotification("Share settings updated", "success");
    closeModal(modal);
  });
}

// Show settings dialog
export function showSettingsDialog() {
  console.log("Opening settings dialog");
  // Use the settings module implementation
  showSettingsModal();
}
