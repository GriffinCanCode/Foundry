/**
 * app-core.js - Core application state and initialization
 */

import { loadSettings, applyTheme } from "../modules/settings.js";
import { initializeUI } from "../modules/ui.js";
import { checkActiveWorkspace, loadWorkspaces } from "../modules/workspace.js";
import { loadDatabaseList, repairDatabaseData } from "../modules/database.js";
import { runWhenIdle } from "../utils/optimizer.js";
import { loadDocumentList, repairDocumentData } from '../modules/document.js';
import { repairWorkspaceData } from '../storage/workspace-storage.js';
import { repairSettings } from '../storage/settings-storage.js';

// Global state for the application
export const appState = {
  currentWorkspace: null,
  workspaceList: [],
  currentDocument: null,
  documentList: [],
  databaseList: [],
  settings: {
    darkMode: false,
    autoSave: true,
    autoSaveInterval: 30,
  },
  autoSaveTimer: null,
  appInitialized: false,
  pendingAction: null,
};

// Initialize the application
export async function initializeApp() {
  console.log("Initializing app core...");

  // Check if we should show the landing page instead of the main app
  // Skip landing page if 'skipLanding=true' or a specific action is requested
  const urlParams = new URLSearchParams(window.location.search);
  const skipLanding = urlParams.get("skipLanding") === "true";
  const hasAction =
    urlParams.has("create") || urlParams.has("load") || urlParams.has("view");

  if (
    !skipLanding &&
    !hasAction &&
    window.location.pathname.endsWith("index.html")
  ) {
    // Redirect to landing page if we're on index.html
    window.location.href = "landing.html";
    return;
  }

  // Process specific actions that might come from the landing page
  if (urlParams.has("create")) {
    const createAction = urlParams.get("create");
    if (createAction === "database") {
      // Will trigger database creation after app loads
      appState.pendingAction = {
        type: "createDatabase",
      };
    } else if (createAction === "workplace") {
      // Will trigger workplace selection after app loads
      appState.pendingAction = {
        type: "showWorkplaceSelection",
      };
    }
  }

  try {
    // Repair settings first since they may be needed for other operations
    console.log("Repairing settings...");
    const settingsRepair = await repairSettings();
    if (settingsRepair.repaired) {
      console.log("Settings repaired:", settingsRepair.repairs.join(", "));
    }

    // Load settings
    console.log("Loading settings...");
    const settings = await loadSettings();
    appState.settings = settings;
    
    // Apply theme from settings
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    
    // Initialize UI components
    console.log("Initializing UI...");
    initializeUI();
    
    // Repair workspace data
    console.log("Repairing workspace data...");
    try {
      const workspaceRepair = await repairWorkspaceData();
      console.log("Workspace repair completed:", workspaceRepair);
    } catch (workspaceError) {
      console.error("Non-critical error during workspace repair:", workspaceError);
    }
    
    // Load workspaces
    console.log("Loading workspaces...");
    await loadWorkspaces();
    checkActiveWorkspace();
    
    // Repair document data to fix any corruption
    console.log("Repairing document data...");
    try {
      const repairResult = await repairDocumentData();
      console.log('Document data repair completed:', repairResult);
    } catch (repairError) {
      console.error('Non-critical error during document repair:', repairError);
    }
    
    // Repair database data
    console.log("Repairing database data...");
    try {
      const databaseRepair = await repairDatabaseData();
      console.log('Database data repair completed:', databaseRepair);
    } catch (dbRepairError) {
      console.error('Non-critical error during database repair:', dbRepairError);
    }
    
    // Load documents
    console.log("Loading documents...");
    await loadDocumentList();
    
    // Load databases
    console.log("Loading databases...");
    await loadDatabaseList();
    
    // Mark app as initialized
    appState.appInitialized = true;

    // Handle any pending actions
    if (appState.pendingAction) {
      processPendingAction(appState.pendingAction);
    }

    // Non-critical tasks that can be deferred
    runWhenIdle(() => {
      console.log("Running non-critical initialization tasks during idle time");

      // Load additional features that aren't needed immediately
      loadNonCriticalFeatures();
    });
    
    console.log('App initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing app:', error);
    return false;
  }
}

// Process any pending actions that were triggered from the landing page
function processPendingAction(action) {
  switch (action.type) {
    case "createDatabase":
      import("../modules/database.js")
        .then((module) => {
          module.createNewDatabase();
        })
        .catch((err) => {
          console.error("Failed to create database", err);
        });
      break;
    case "showWorkplaceSelection":
      import("../modules/workspace.js")
        .then((module) => {
          module.showWorkspaceSelection();
        })
        .catch((err) => {
          console.error("Failed to show workplace selection", err);
        });
      break;
  }

  // Clear the pending action
  appState.pendingAction = null;
}

// Load features that aren't needed for immediate app functionality
function loadNonCriticalFeatures() {
  // Load analytics if configured
  if (appState.settings.enableAnalytics) {
    import("../utils/analytics.js")
      .then((module) => {
        module.initializeAnalytics();
      })
      .catch((err) => {
        console.warn(
          "Failed to load analytics module (this is normal if analytics is not configured)",
          err
        );
      });
  }

  // Prefetch templates for better performance when user needs them
  if (appState.settings.enableTemplates) {
    import("../modules/templates.js")
      .then((module) => {
        module.prefetchTemplates();
      })
      .catch((err) => {
        console.warn(
          "Failed to prefetch templates (this is normal if templates are not configured)",
          err
        );
      });
  }

  // Preload any other modules that might be needed later
  import("../utils/export.js").catch((err) => {
    console.warn("Failed to preload export module (this is normal)");
  });
}
