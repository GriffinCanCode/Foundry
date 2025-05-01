/**
 * settings.js - Application settings management
 */

import { appState } from '../core/app-core.js';
import { showNotification } from '../utils/notifications.js';
import { closeModal } from '../utils/modals.js';

// Load user settings from localStorage
export function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('foundry_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            appState.settings = { ...appState.settings, ...settings };
            
            // Apply dark mode if enabled
            if (appState.settings.darkMode) {
                document.documentElement.classList.add('dark-mode');
            }
        } else {
            // Default to system preference for dark mode
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                appState.settings.darkMode = true;
                document.documentElement.classList.add('dark-mode');
            }
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

// Apply theme (light/dark) based on settings
export function applyTheme() {
    if (appState.settings.darkMode) {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
}

// Setup autosave functionality
export function setupAutoSave() {
    // Clear any existing timer
    if (appState.autoSaveTimer) {
        clearInterval(appState.autoSaveTimer);
    }
    
    // If autosave is enabled, set up the timer
    if (appState.settings.autoSave) {
        const interval = appState.settings.autoSaveInterval * 1000; // Convert to milliseconds
        appState.autoSaveTimer = setInterval(() => {
            if (appState.currentDocument) {
                // Using dynamic import to avoid circular dependencies
                import('./document.js').then(module => {
                    module.saveCurrentDocument(true); // Silent save
                });
            }
        }, interval);
    }
}

// Show settings dialog
export function showSettingsDialog() {
    // Create modal for settings
    const modalHTML = `
    <div id="settings-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Settings</h3>
                <button id="close-settings-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-6">
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3">Appearance</h4>
                    <div class="flex items-center justify-between bg-surface-50 p-3 rounded-lg">
                        <span class="text-sm text-surface-700">Dark Mode</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="dark-mode-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3">Editor</h4>
                    <div class="space-y-3 bg-surface-50 p-3 rounded-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-surface-700">Auto-save</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="autosave-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                        
                        <div class="pt-2">
                            <label class="block text-sm text-surface-700 mb-2">Auto-save interval (seconds)</label>
                            <input type="number" id="autosave-interval" value="30" min="10" max="300"
                                   class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3">Data Storage</h4>
                    <div class="space-y-2">
                        <button id="export-all-data" class="w-full px-4 py-3 text-sm bg-surface-50 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors text-left flex items-center">
                            <i data-lucide="download" class="w-4 h-4 mr-2"></i>
                            Export all documents
                        </button>
                        <label for="import-file" class="w-full px-4 py-3 text-sm bg-surface-50 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors text-left cursor-pointer flex items-center">
                            <i data-lucide="upload" class="w-4 h-4 mr-2"></i>
                            Import documents
                        </label>
                        <input type="file" id="import-file" accept=".json" class="hidden">
                    </div>
                </div>
                
                <div class="pt-4 flex justify-end space-x-3">
                    <button id="settings-cancel-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
                        Cancel
                    </button>
                    <button id="settings-save-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    const modal = document.getElementById('settings-modal');
    
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
    
    // Set initial state for dark mode toggle based on system preference
    if (appState.settings.darkMode) {
        document.getElementById('dark-mode-toggle').checked = true;
    }
    
    // Set initial state for autosave toggle and interval
    document.getElementById('autosave-toggle').checked = appState.settings.autoSave;
    document.getElementById('autosave-interval').value = appState.settings.autoSaveInterval;
    
    // Add event listeners
    document.getElementById('close-settings-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('settings-cancel-btn').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('settings-save-btn').addEventListener('click', () => {
        // In a real app, this would save the settings to the backend/local storage
        const darkMode = document.getElementById('dark-mode-toggle').checked;
        const autoSave = document.getElementById('autosave-toggle').checked;
        const autoSaveInterval = document.getElementById('autosave-interval').value;
        
        // Update app state
        appState.settings.darkMode = darkMode;
        appState.settings.autoSave = autoSave;
        appState.settings.autoSaveInterval = parseInt(autoSaveInterval, 10);
        
        // Apply theme
        applyTheme();
        
        // Save settings to local storage for persistence
        localStorage.setItem('foundry_settings', JSON.stringify(appState.settings));
        
        // Update autosave functionality
        setupAutoSave();
        
        showNotification('Settings saved', 'success');
        closeModal(modal);
    });
    
    document.getElementById('export-all-data').addEventListener('click', () => {
        import('./document.js').then(module => {
            module.exportAllDocuments();
        });
    });
    
    document.getElementById('import-file').addEventListener('change', (e) => {
        import('./document.js').then(module => {
            module.importDocuments(e.target.files[0]);
        });
    });
} 