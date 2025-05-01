/**
 * settings.js - Application settings management
 */

import { appState } from '../core/app-core.js';
import { showNotification } from '../utils/notifications.js';
import { closeModal } from '../utils/modals.js';
import { 
    initializeSettingsStorage, 
    loadSettings as loadSettingsFromStorage, 
    saveSettings as saveSettingsToStorage,
    updateSettings,
    getSetting,
    setSetting,
    resetSettings
} from '../storage/settings-storage.js';
import { StorageStrategy, initializeStorage } from '../storage/storage-manager.js';

// Initialize settings storage when module is imported
initializeSettingsStorage().catch(error => {
    console.error('Failed to initialize settings storage:', error);
});

// Load user settings from backend
export async function loadSettings() {
    try {
        const settings = await loadSettingsFromStorage();
        
        if (settings) {
            appState.settings = { ...appState.settings, ...settings };
            
            // Apply dark mode if enabled
            if (appState.settings.darkMode) {
                document.documentElement.classList.add('dark-mode');
            }
            
            // Setup autosave if enabled
            if (appState.settings.autoSave) {
                setupAutoSave();
            }
            
            return settings;
        } else {
            console.error('Error loading settings');
            
            // Default to system preference for dark mode
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                appState.settings.darkMode = true;
                document.documentElement.classList.add('dark-mode');
            }
            
            return appState.settings;
        }
    } catch (err) {
        console.error('Error loading settings:', err);
        
        // Default to system preference for dark mode
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            appState.settings.darkMode = true;
            document.documentElement.classList.add('dark-mode');
        }
        
        return appState.settings;
    }
}

// Save user settings to backend
export async function saveSettings(settings = appState.settings) {
    try {
        const result = await saveSettingsToStorage(settings);
        
        if (result.success) {
            // Update app state with the returned settings
            appState.settings = { ...appState.settings, ...settings };
            return true;
        } else {
            console.error('Error saving settings');
            return false;
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
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

// Reinitialize storage system with new settings
export async function reinitializeStorage(settings) {
    try {
        // Extract storage-related settings
        const storageConfig = {
            strategy: settings.syncStrategy || StorageStrategy.HYBRID,
            autoSync: settings.autoSync !== false,
            enableCompression: settings.enableCompression || false,
            enableEncryption: settings.enableEncryption || false
        };
        
        // Reinitialize storage with new config
        await initializeStorage(storageConfig);
        
        console.log('Storage system reinitialized with new settings');
        return true;
    } catch (error) {
        console.error('Failed to reinitialize storage system:', error);
        return false;
    }
}

// Settings hook - provides access to settings and methods to update them
export function useSettings() {
    return {
        // Get current settings
        getSettings: () => ({ ...appState.settings }),
        
        // Update a single setting
        updateSetting: async (key, value) => {
            // Update app state immediately for responsive UI
            appState.settings[key] = value;
            
            // Apply theme if darkMode was updated
            if (key === 'darkMode') {
                applyTheme();
            }
            
            // Update autosave timer if autoSave or interval was changed
            if (key === 'autoSave' || key === 'autoSaveInterval') {
                setupAutoSave();
            }
            
            // Reinitialize storage if storage settings changed
            if (key === 'syncStrategy' || key === 'autoSync' || 
                key === 'enableCompression' || key === 'enableEncryption') {
                await reinitializeStorage(appState.settings);
            }
            
            // Save to storage
            const result = await setSetting(key, value);
            return !!result;
        },
        
        // Update multiple settings at once
        updateSettings: async (newSettings) => {
            // Update app state immediately for responsive UI
            appState.settings = {
                ...appState.settings,
                ...newSettings
            };
            
            // Apply theme if darkMode was updated
            if ('darkMode' in newSettings) {
                applyTheme();
            }
            
            // Update autosave timer if autoSave or interval was changed
            if ('autoSave' in newSettings || 'autoSaveInterval' in newSettings) {
                setupAutoSave();
            }
            
            // Reinitialize storage if storage settings changed
            if ('syncStrategy' in newSettings || 'autoSync' in newSettings || 
                'enableCompression' in newSettings || 'enableEncryption' in newSettings) {
                await reinitializeStorage(appState.settings);
            }
            
            // Save to storage
            const result = await updateSettings(newSettings);
            return !!result;
        },
        
        // Reset settings to defaults
        resetSettings: async () => {
            // Reset settings in storage
            const defaultSettings = await resetSettings();
            
            // Update app state
            appState.settings = defaultSettings;
            
            // Apply theme
            applyTheme();
            
            // Setup autosave
            setupAutoSave();
            
            // Reinitialize storage
            await reinitializeStorage(defaultSettings);
            
            return true;
        }
    };
}

// Named event handler functions for the settings modal
const modalEventHandlers = {
    closeModal: null,
    cancelSettings: null,
    saveSettings: null,
    exportData: null,
    importData: null
};

// Remove any existing settings modal event listeners
function removeSettingsModalListeners() {
    // Clean up any existing modal with the same ID
    const existingModal = document.getElementById('settings-modal');
    if (existingModal) {
        console.log('Found existing settings modal, removing it');
        existingModal.parentNode.removeChild(existingModal);
    }
    
    // Clean up document-level event delegation
    document.removeEventListener('click', modalEventHandlers.closeModal);
    document.removeEventListener('click', modalEventHandlers.cancelSettings);
    document.removeEventListener('click', modalEventHandlers.saveSettings);
    document.removeEventListener('click', modalEventHandlers.exportData);
    document.removeEventListener('click', modalEventHandlers.importData);
}

// Show settings dialog
export function showSettingsDialog() {
    console.log('Opening settings dialog from settings.js');
    
    // First, clean up any existing modal
    removeSettingsModalListeners();
    
    // Create modal for settings
    const modalHTML = `
    <div id="settings-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95 dark-mode:bg-surface-800">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900 dark-mode:text-white">Settings</h3>
                <button id="close-settings-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors dark-mode:hover:bg-surface-700 dark-mode:text-surface-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
            
            <div class="space-y-6">
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3 dark-mode:text-surface-200">Appearance</h4>
                    <div class="flex items-center justify-between bg-surface-50 p-3 rounded-lg dark-mode:bg-surface-700">
                        <span class="text-sm text-surface-700 dark-mode:text-surface-300">Dark Mode</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="dark-mode-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark-mode:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3 dark-mode:text-surface-200">Editor</h4>
                    <div class="space-y-3 bg-surface-50 p-3 rounded-lg dark-mode:bg-surface-700">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-surface-700 dark-mode:text-surface-300">Auto-save</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="autosave-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark-mode:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                        
                        <div class="pt-2">
                            <label class="block text-sm text-surface-700 mb-2 dark-mode:text-surface-300">Auto-save interval (seconds)</label>
                            <input type="number" id="autosave-interval" value="30" min="10" max="300"
                                   class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark-mode:bg-surface-600 dark-mode:border-surface-500 dark-mode:text-white">
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3 dark-mode:text-surface-200">Storage</h4>
                    <div class="space-y-3 bg-surface-50 p-3 rounded-lg dark-mode:bg-surface-700">
                        <div>
                            <label class="block text-sm text-surface-700 mb-2 dark-mode:text-surface-300">Storage Strategy</label>
                            <select id="storage-strategy" 
                                   class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark-mode:bg-surface-600 dark-mode:border-surface-500 dark-mode:text-white">
                                <option value="hybrid">Hybrid (Local + Backend)</option>
                                <option value="local">Local Only</option>
                                <option value="backend">Backend Only</option>
                            </select>
                            <p class="mt-1 text-xs text-surface-500 dark-mode:text-surface-400">
                                Hybrid: Works offline, syncs when online<br>
                                Local: Stored in browser only<br>
                                Backend: Always requires connection
                            </p>
                        </div>
                        
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-surface-700 dark-mode:text-surface-300">Auto-sync</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="autosync-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark-mode:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-base font-medium text-surface-800 mb-3 dark-mode:text-surface-200">Data Management</h4>
                    <div class="space-y-2">
                        <button id="export-all-data" class="w-full px-4 py-3 text-sm bg-surface-50 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors text-left flex items-center dark-mode:bg-surface-700 dark-mode:border-surface-600 dark-mode:text-surface-300 dark-mode:hover:bg-surface-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            Export all documents
                        </button>
                        <label for="import-file" class="w-full px-4 py-3 text-sm bg-surface-50 text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors text-left cursor-pointer flex items-center dark-mode:bg-surface-700 dark-mode:border-surface-600 dark-mode:text-surface-300 dark-mode:hover:bg-surface-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                            Import documents
                        </label>
                        <input type="file" id="import-file" accept=".json" class="hidden">
                    </div>
                </div>
                
                <div class="pt-4 flex justify-end space-x-3">
                    <button id="settings-cancel-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors dark-mode:bg-surface-700 dark-mode:text-surface-300 dark-mode:hover:bg-surface-600">
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
    
    // Set initial state for dark mode toggle
    document.getElementById('dark-mode-toggle').checked = appState.settings.darkMode;
    
    // Set initial state for autosave toggle and interval
    document.getElementById('autosave-toggle').checked = appState.settings.autoSave;
    document.getElementById('autosave-interval').value = appState.settings.autoSaveInterval;
    
    // Set initial state for storage options
    const storageStrategySelect = document.getElementById('storage-strategy');
    if (storageStrategySelect) {
        storageStrategySelect.value = appState.settings.syncStrategy || StorageStrategy.HYBRID;
    }
    
    const autoSyncToggle = document.getElementById('autosync-toggle');
    if (autoSyncToggle) {
        autoSyncToggle.checked = appState.settings.autoSync !== false;
    }
    
    // Define event handler functions with proper binding to use as references
    const handleCloseModal = function(e) {
        if (e.target.id === 'close-settings-modal' || e.target.closest('#close-settings-modal')) {
            console.log('Close modal button clicked');
            e.preventDefault();
            closeModal(modal);
        }
    };

    const handleCancelSettings = function(e) {
        if (e.target.id === 'settings-cancel-btn' || e.target.closest('#settings-cancel-btn')) {
            console.log('Cancel button clicked');
            e.preventDefault();
            closeModal(modal);
        }
    };

    const handleSaveSettings = async function(e) {
        if (e.target.id === 'settings-save-btn' || e.target.closest('#settings-save-btn')) {
            console.log('Save button clicked');
            e.preventDefault();
            
            const darkModeToggle = document.getElementById('dark-mode-toggle');
            const autoSaveToggle = document.getElementById('autosave-toggle');
            const autoSaveInterval = document.getElementById('autosave-interval');
            const storageStrategy = document.getElementById('storage-strategy');
            const autoSyncToggle = document.getElementById('autosync-toggle');
            
            if (!darkModeToggle || !autoSaveToggle || !autoSaveInterval || !storageStrategy || !autoSyncToggle) {
                console.error('Could not find required form elements');
                return;
            }
            
            const darkMode = darkModeToggle.checked;
            const autoSave = autoSaveToggle.checked;
            const interval = parseInt(autoSaveInterval.value, 10);
            const syncStrategy = storageStrategy.value;
            const autoSync = autoSyncToggle.checked;
            
            // Get the settings hook
            const { updateSettings } = useSettings();
            
            // Update all settings at once
            const success = await updateSettings({
                darkMode,
                autoSave,
                autoSaveInterval: interval,
                syncStrategy,
                autoSync
            });
            
            if (success) {
                showNotification('Settings saved', 'success');
            } else {
                showNotification('Failed to save settings', 'error');
            }
            
            closeModal(modal);
        }
    };

    const handleExportData = function(e) {
        if (e.target.id === 'export-all-data' || e.target.closest('#export-all-data')) {
            console.log('Export data button clicked');
            e.preventDefault();
            import('./document.js').then(module => {
                module.exportAllDocuments();
            });
        }
    };

    // Store handlers for later removal
    modalEventHandlers.closeModal = handleCloseModal;
    modalEventHandlers.cancelSettings = handleCancelSettings;
    modalEventHandlers.saveSettings = handleSaveSettings;
    modalEventHandlers.exportData = handleExportData;
    
    // Use event delegation for dynamic content - attach listeners to document
    document.addEventListener('click', handleCloseModal);
    document.addEventListener('click', handleCancelSettings);
    document.addEventListener('click', handleSaveSettings);
    document.addEventListener('click', handleExportData);
    
    // Import file requires a change event
    const handleImportFile = function(e) {
        if (e.target.id === 'import-file') {
            console.log('Import file triggered');
            import('./document.js').then(module => {
                module.importDocuments(e.target.files[0]);
            });
        }
    };
    
    modalEventHandlers.importData = handleImportFile;
    document.addEventListener('change', handleImportFile);
    
    // For debugging
    console.log('Settings modal initialized with event handlers');
}