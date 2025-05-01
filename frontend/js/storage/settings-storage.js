/**
 * settings-storage.js - Settings-specific storage implementation
 * 
 * This module provides settings-specific storage operations that leverage
 * the core storage manager for persistence.
 */

import { 
  initializeStorage, 
  saveData, 
  loadData,
  syncWithBackend,
  StorageStrategy
} from './storage-manager.js';

// Store type for settings
const STORE_TYPE = 'settings';
const SETTINGS_ID = 'app-settings';

// Default settings values
const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  darkMode: false,
  autoSave: true,
  autoSaveInterval: 30,
  enableCompression: false,
  enableEncryption: false,
  enableAnalytics: false,
  syncStrategy: StorageStrategy.HYBRID,
  lastUpdated: new Date().toISOString()
};

// Initialize settings storage
export async function initializeSettingsStorage(options = {}) {
  await initializeStorage(options);
}

/**
 * Load application settings
 * 
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The settings object
 */
export async function loadSettings(options = {}) {
  try {
    const settings = await loadData(STORE_TYPE, SETTINGS_ID, options);
    return settings;
  } catch (error) {
    // If settings don't exist yet, create default settings
    console.log('Creating default settings');
    const defaultSettings = { ...DEFAULT_SETTINGS };
    await saveSettings(defaultSettings, options);
    return defaultSettings;
  }
}

/**
 * Save application settings
 * 
 * @param {Object} settings - The settings to save
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - Result with success status
 */
export async function saveSettings(settings, options = {}) {
  // Ensure ID is set
  const settingsToSave = {
    ...settings,
    id: SETTINGS_ID,
    lastUpdated: new Date().toISOString()
  };
  
  return await saveData(STORE_TYPE, settingsToSave, options);
}

/**
 * Update specific settings values
 * 
 * @param {Object} updates - Object with settings updates
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The updated settings
 */
export async function updateSettings(updates, options = {}) {
  const currentSettings = await loadSettings(options);
  
  // Apply updates to current settings
  const updatedSettings = {
    ...currentSettings,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  await saveSettings(updatedSettings, options);
  return updatedSettings;
}

/**
 * Get a specific setting value
 * 
 * @param {string} key - The setting key to get
 * @param {*} defaultValue - Default value if setting not found
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<*>} - The setting value
 */
export async function getSetting(key, defaultValue = null, options = {}) {
  const settings = await loadSettings(options);
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Set a specific setting value
 * 
 * @param {string} key - The setting key to set
 * @param {*} value - The value to set
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The updated settings
 */
export async function setSetting(key, value, options = {}) {
  const updates = { [key]: value };
  return await updateSettings(updates, options);
}

/**
 * Reset settings to defaults
 * 
 * @param {Array} keysToReset - Keys to reset (omit for all)
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The updated settings
 */
export async function resetSettings(keysToReset = null, options = {}) {
  let currentSettings = await loadSettings(options);
  
  if (keysToReset && Array.isArray(keysToReset)) {
    // Reset only specified keys
    keysToReset.forEach(key => {
      if (key in DEFAULT_SETTINGS) {
        currentSettings[key] = DEFAULT_SETTINGS[key];
      }
    });
  } else {
    // Reset all settings but preserve ID
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  
  currentSettings.lastUpdated = new Date().toISOString();
  await saveSettings(currentSettings, options);
  return currentSettings;
}

/**
 * Force synchronization of settings with backend
 * 
 * @returns {Promise<Object>} - Sync result
 */
export async function syncSettings() {
  return await syncWithBackend();
} 