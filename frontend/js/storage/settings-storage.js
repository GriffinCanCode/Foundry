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
  StorageStrategy,
} from "./storage-manager.js";

// Store type for settings
const STORE_TYPE = "settings";
const SETTINGS_ID = "app-settings";

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
  lastUpdated: new Date().toISOString(),
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
    console.log('Loading application settings');
    // Try to load existing settings
    try {
      const settings = await loadData(STORE_TYPE, SETTINGS_ID, options);
      if (settings) {
        // Ensure ID is set
        if (!settings.id) {
          settings.id = SETTINGS_ID;
        }
        
        // Fill in any missing default values
        const completeSettings = { ...DEFAULT_SETTINGS, ...settings };
        
        console.log('Settings loaded successfully');
        return completeSettings;
      }
    } catch (error) {
      console.log(
        "No existing settings found, creating defaults",
        error.message
      );
    }

    // If settings don't exist yet or load failed, create default settings
    console.log("Creating default settings");
    const defaultSettings = { ...DEFAULT_SETTINGS, id: SETTINGS_ID };

    try {
      await saveSettings(defaultSettings, options);
      return defaultSettings;
    } catch (saveError) {
      console.error("Failed to save default settings:", saveError);
      // Still return default settings even if save failed
      return defaultSettings;
    }
  } catch (error) {
    console.error("Error in loadSettings:", error);
    // Return default settings as fallback
    return { ...DEFAULT_SETTINGS, id: SETTINGS_ID };
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
  try {
    // Create a clean copy of settings to avoid reference issues
    const cleanSettings = { ...settings };
    
    // Ensure ID is set
    cleanSettings.id = cleanSettings.id || SETTINGS_ID;
    cleanSettings.lastUpdated = new Date().toISOString();
    
    // Remove any null or undefined values
    Object.keys(cleanSettings).forEach(key => {
      if (cleanSettings[key] === undefined || cleanSettings[key] === null) {
        delete cleanSettings[key];
      }
    });
    
    console.log('Saving application settings');
    const result = await saveData(STORE_TYPE, cleanSettings, options);
    console.log('Settings saved successfully');
    return result;
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Update specific settings values
 *
 * @param {Object} updates - Object with settings updates
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The updated settings
 */
export async function updateSettings(updates, options = {}) {
  try {
    const currentSettings = await loadSettings(options);
    
    // Validate updates to ensure they're proper settings values
    const validatedUpdates = { ...updates };
    for (const key in validatedUpdates) {
      // Skip undefined or null values
      if (validatedUpdates[key] === undefined || validatedUpdates[key] === null) {
        delete validatedUpdates[key];
      }
    }

    // Apply updates to current settings
    const updatedSettings = {
      ...currentSettings,
      ...validatedUpdates,
      lastUpdated: new Date().toISOString(),
    };

    await saveSettings(updatedSettings, options);
    return updatedSettings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
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
  try {
    const settings = await loadSettings(options);
    return settings[key] !== undefined ? settings[key] : defaultValue;
  } catch (error) {
    console.error(`Error getting setting "${key}":`, error);
    return defaultValue;
  }
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
  try {
    if (key === undefined || key === null || key === '') {
      throw new Error('Invalid setting key');
    }
    
    const updates = { [key]: value };
    return await updateSettings(updates, options);
  } catch (error) {
    console.error(`Error setting "${key}" setting:`, error);
    throw error;
  }
}

/**
 * Reset settings to defaults
 *
 * @param {Array} keysToReset - Keys to reset (omit for all)
 * @param {Object} options - Storage options (optional)
 * @returns {Promise<Object>} - The updated settings
 */
export async function resetSettings(keysToReset = null, options = {}) {
  try {
    let currentSettings = await loadSettings(options);

    if (keysToReset && Array.isArray(keysToReset)) {
      console.log(`Resetting specific settings: ${keysToReset.join(', ')}`);
      // Reset only specified keys
      keysToReset.forEach((key) => {
        if (key in DEFAULT_SETTINGS) {
          currentSettings[key] = DEFAULT_SETTINGS[key];
        }
      });
    } else {
      console.log('Resetting all settings to defaults');
      // Reset all settings but preserve ID
      const id = currentSettings.id;
      currentSettings = { ...DEFAULT_SETTINGS, id };
    }

    currentSettings.lastUpdated = new Date().toISOString();
    await saveSettings(currentSettings, options);
    return currentSettings;
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
}

/**
 * Force synchronization of settings with backend
 *
 * @returns {Promise<Object>} - Sync result
 */
export async function syncSettings() {
  try {
    const result = await syncWithBackend();
    console.log('Settings synchronized with backend');
    return result;
  } catch (error) {
    console.error('Error synchronizing settings:', error);
    throw error;
  }
}

/**
 * Repair settings if corrupted
 * 
 * @returns {Promise<Object>} - Repair results
 */
export async function repairSettings() {
  try {
    console.log('Starting settings repair process');
    
    let settings;
    let needsRepair = false;
    let repairs = [];
    
    // Try to load current settings
    try {
      settings = await loadData(STORE_TYPE, SETTINGS_ID);
    } catch (error) {
      console.warn('Failed to load settings, creating new defaults');
      settings = { ...DEFAULT_SETTINGS };
      needsRepair = true;
      repairs.push('created new settings file');
    }
    
    // Ensure ID is correct
    if (!settings.id || settings.id !== SETTINGS_ID) {
      settings.id = SETTINGS_ID;
      needsRepair = true;
      repairs.push('fixed settings ID');
    }
    
    // Ensure all default values exist
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (settings[key] === undefined) {
        settings[key] = value;
        needsRepair = true;
        repairs.push(`added missing ${key} setting`);
      }
    }
    
    // Fix timestamps
    if (!settings.lastUpdated) {
      settings.lastUpdated = new Date().toISOString();
      needsRepair = true;
      repairs.push('fixed missing timestamp');
    }
    
    // Save repaired settings if needed
    if (needsRepair) {
      await saveData(STORE_TYPE, settings, { silent: true });
      console.log(`Settings repaired: ${repairs.join(', ')}`);
    } else {
      console.log('Settings are valid, no repair needed');
    }
    
    return {
      repaired: needsRepair,
      repairs: repairs,
      settings: settings
    };
  } catch (error) {
    console.error('Error repairing settings:', error);
    return {
      repaired: false,
      error: error.message,
      settings: { ...DEFAULT_SETTINGS, id: SETTINGS_ID }
    };
  }
}
