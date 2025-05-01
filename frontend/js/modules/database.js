/**
 * database.js - Database operations and management
 */

import { appState } from "../core/app-core.js";
import { renderDatabaseList } from "./ui.js";
import { showNotification } from "../utils/notifications.js";
import { closeModal } from "../utils/modals.js";
import { memoize, Cache } from "../utils/optimizer.js";
import {
  initializeDatabaseStorage,
  saveDatabase,
  loadDatabase as loadDatabaseFromStorage,
  deleteDatabase as deleteDatabaseFromStorage,
  listDatabases as listDatabasesFromStorage,
  repairDatabaseData
} from "../storage/database-storage.js";

// Initialize database storage when module is imported
initializeDatabaseStorage().catch((error) => {
  console.error("Failed to initialize database storage:", error);
});

// Re-export the repair function so it can be used by app-core.js
export { repairDatabaseData };

// Sample table data to simulate database functionality
const sampleTableData = {
  tasks: [
    { id: 1, name: "Research topic", status: "Completed", due: "2023-06-01" },
    { id: 2, name: "Draft outline", status: "In Progress", due: "2023-06-10" },
    {
      id: 3,
      name: "Write introduction",
      status: "Not Started",
      due: "2023-06-15",
    },
    {
      id: 4,
      name: "Create diagrams",
      status: "Not Started",
      due: "2023-06-20",
    },
  ],
  people: [
    {
      id: 1,
      name: "John Smith",
      role: "Project Manager",
      email: "john@example.com",
    },
    {
      id: 2,
      name: "Alice Johnson",
      role: "Designer",
      email: "alice@example.com",
    },
    { id: 3, name: "Bob Wilson", role: "Developer", email: "bob@example.com" },
  ],
  notes: [
    {
      id: 1,
      title: "Meeting notes",
      content: "Discussed project timeline",
      date: "2023-05-28",
    },
    {
      id: 2,
      title: "Research findings",
      content: "Key insights from literature review",
      date: "2023-05-30",
    },
  ],
};

// Cache for database data
const databaseCache = new Cache(10);

// View a database
export function viewDatabase(id) {
  // Find database in state
  const database = appState.databaseList.find((db) => db.id === id);
  if (!database) {
    showNotification("Database not found", "error");
    return;
  }

  // Show database interface
  showDatabaseInterface(database);
}

// Create a new database
export function createNewDatabase() {
  console.log("Creating new database...");

  // Show database creation modal
  const modal = document.createElement("div");
  modal.id = "database-modal";
  modal.className =
    "modal fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300";

  modal.innerHTML = `
        <div class="modal-content bg-white rounded-xl shadow-xl p-6 w-full max-w-lg transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Create New Database</h3>
                <button id="close-database-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Database Name</label>
                    <input id="database-name" type="text" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Enter database name">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Type</label>
                    <select id="database-type" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                        <option value="table">Table</option>
                        <option value="list">List</option>
                        <option value="kanban">Kanban Board</option>
                        <option value="calendar">Calendar</option>
                    </select>
                </div>
                
                <div class="pt-4 flex justify-end space-x-3">
                    <button id="cancel-database-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
                        Cancel
                    </button>
                    <button id="create-database-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Create Database
                    </button>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // Fade in animation
  setTimeout(() => {
    modal.classList.add("opacity-100");
    modal.querySelector(".modal-content").classList.add("scale-100");
  }, 10);

  // Add event listeners
  document
    .getElementById("close-database-modal")
    .addEventListener("click", () => {
      closeModal(modal);
    });

  document
    .getElementById("cancel-database-btn")
    .addEventListener("click", () => {
      closeModal(modal);
    });

  document
    .getElementById("create-database-btn")
    .addEventListener("click", () => {
      const name = document.getElementById("database-name").value.trim();
      const type = document.getElementById("database-type").value;

      if (!name) {
        showNotification("Please enter a database name", "error");
        return;
      }

      // Create database
      const databaseId = "db_" + Date.now();
      const database = {
        id: databaseId,
        name: name,
        type: type,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        workspaceId: appState.currentWorkspace?.id,
        tables: [
          {
            id: "table_" + Date.now(),
            name: "Default Table",
            columns: getDefaultColumns(type),
            rows: []
          }
        ]
      };

      // Save database using storage module
      saveDatabase(database)
        .then(result => {
          // Clear cache for this database
          databaseCache.delete(databaseId);

          // Add to app state
          if (!appState.databaseList.some(db => db.id === database.id)) {
            appState.databaseList.push(database);
            renderDatabaseList();
          }

          showNotification(`Database "${name}" created successfully`, "success");

          // Close modal
          closeModal(modal);

          // Add database block to editor
          if (typeof window.addDatabaseBlock === "function") {
            window.addDatabaseBlock(name, databaseId);
          }
        })
        .catch(error => {
          console.error("Error saving database:", error);
          showNotification("Failed to create database", "error");
        });
    });
}

// Show database interface
function showDatabaseInterface(database) {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // Remember the current editor state
  const editorBackup = document.getElementById("editor")?.innerHTML || "";
  const titleBackup =
    document.getElementById("document-title")?.textContent || "";

  // Create database view HTML
  const dbViewHTML = `
    <div id="database-view" class="bg-white h-full overflow-hidden flex flex-col">
        <div class="flex items-center justify-between border-b border-surface-200 p-4">
            <h1 class="text-xl font-display font-semibold">${database.name}</h1>
            <div class="flex space-x-2">
                <button id="add-record-btn" class="px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Record
                </button>
                <button id="close-db-view-btn" class="px-3 py-1.5 bg-surface-100 text-surface-700 rounded-md hover:bg-surface-200 transition-colors text-sm">
                    Back to Document
                </button>
            </div>
        </div>
        
        <div class="flex-grow p-4 overflow-auto">
            <div class="bg-surface-50 rounded-lg border border-surface-200 overflow-hidden">
                <table class="min-w-full bg-white">
                    <thead>
                        <tr class="bg-surface-100 text-surface-700 text-sm">
                            ${getTableHeaders(database)}
                        </tr>
                    </thead>
                    <tbody>
                        ${getTableRows(database)}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

  // Store the editor state temporarily
  localStorage.setItem(
    "foundry_editor_backup",
    JSON.stringify({
      editorContent: editorBackup,
      documentTitle: titleBackup,
    })
  );

  // Replace main content with database view
  mainContent.innerHTML = dbViewHTML;

  // Add event listeners
  document.getElementById("close-db-view-btn").addEventListener("click", () => {
    // Restore editor content
    const backup = JSON.parse(
      localStorage.getItem("foundry_editor_backup") || "{}"
    );
    mainContent.innerHTML = `
      <div class="py-4 px-6 border-b border-surface-200">
        <h1 id="document-title" class="text-2xl font-display font-semibold outline-none" contenteditable>${
          backup.documentTitle || ""
        }</h1>
      </div>
      <div id="editor" class="p-6 focus:outline-none">${
        backup.editorContent || ""
      }</div>
    `;

    // Reinitialize editor
    import("./page-editor.js").then((module) => {
      module.initializePageEditor(document.getElementById("editor"));
    });
  });

  document.getElementById("add-record-btn").addEventListener("click", () => {
    addNewRecord(database);
  });
}

// Get table headers
function getTableHeaders(database) {
  // For now, use sample data based on database type
  const table = database.type === "table" ? "tasks" : "people";
  const data = getSampleData(database, table);

  // Get column data from first row or use keys
  const columns = data.length > 0 ? Object.keys(data[0]) : ["id", "name"];

  // Generate header HTML
  return columns
    .map((col) => {
      const colName = col
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `<th class="px-4 py-3 text-left">${colName}</th>`;
    })
    .join("");
}

// Get table rows
function getTableRows(database) {
  // For now, use sample data based on database type
  const table = database.type === "table" ? "tasks" : "people";
  const data = getSampleData(database, table);

  if (data.length === 0) {
    return `<tr><td colspan="5" class="px-4 py-4 text-center text-surface-500">No data available</td></tr>`;
  }

  // Get columns from first row
  const columns = Object.keys(data[0]);

  // Generate rows HTML
  return data
    .map((row) => {
      return `
        <tr class="border-t border-surface-200 hover:bg-surface-50">
          ${columns
            .map((col) => {
              let cellValue = row[col];
              
              // Format based on column type
              if (col === "due" || col === "date") {
                cellValue = new Date(cellValue).toLocaleDateString();
              } else if (col === "status") {
                const statusClass = 
                  cellValue === "Completed" ? "bg-green-100 text-green-800" :
                  cellValue === "In Progress" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800";
                
                cellValue = `<span class="px-2 py-1 rounded-full text-xs ${statusClass}">${cellValue}</span>`;
              }
              
              return `<td class="px-4 py-3">${cellValue}</td>`;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");
}

// Add a new record
function addNewRecord(database) {
  // For now, use sample data based on database type
  const table = database.type === "table" ? "tasks" : "people";
  const data = getSampleData(database, table);

  // Get columns from first row or default
  const columns = data.length > 0 ? Object.keys(data[0]) : ["id", "name"];

  // Create modal for adding record
  const modal = document.createElement("div");
  modal.id = "add-record-modal";
  modal.className =
    "modal fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300";

  // Generate form fields based on columns
  const formFields = columns
    .map((col) => {
      // Skip id field as it will be generated
      if (col === "id") return "";

      const colName = col
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      let inputHTML = "";
      if (col === "status") {
        inputHTML = `
          <select id="field-${col}" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        `;
      } else if (col === "due" || col === "date") {
        inputHTML = `<input id="field-${col}" type="date" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">`;
      } else {
        inputHTML = `<input id="field-${col}" type="text" class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter ${colName}">`;
      }

      return `
        <div>
          <label class="block text-sm font-medium text-surface-700 mb-2">${colName}</label>
          ${inputHTML}
        </div>
      `;
    })
    .join("");

  modal.innerHTML = `
    <div class="modal-content bg-white rounded-xl shadow-xl p-6 w-full max-w-lg transform transition-all duration-300 scale-95">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-display font-semibold text-surface-900">Add New Record</h3>
        <button id="close-record-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="space-y-5">
        ${formFields}
        
        <div class="pt-4 flex justify-end space-x-3">
          <button id="cancel-record-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
            Cancel
          </button>
          <button id="save-record-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Save Record
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fade in animation
  setTimeout(() => {
    modal.classList.add("opacity-100");
    modal.querySelector(".modal-content").classList.add("scale-100");
  }, 10);

  // Add event listeners
  document
    .getElementById("close-record-modal")
    .addEventListener("click", () => {
      closeModal(modal);
    });

  document.getElementById("cancel-record-btn").addEventListener("click", () => {
    closeModal(modal);
  });

  document.getElementById("save-record-btn").addEventListener("click", () => {
    // Collect form data
    const newRecord = { id: data.length + 1 };
    columns.forEach((col) => {
      if (col !== "id") {
        const field = document.getElementById(`field-${col}`);
        if (field) {
          newRecord[col] = field.value;
        }
      }
    });

    // Add record to database (this is a simulation for now)
    database.tables = database.tables || [];
    const defaultTable = database.tables[0] || {
      id: "table_" + Date.now(),
      name: "Default Table",
      columns: columns.map(col => ({ id: col, name: col, type: "text" })),
      rows: []
    };
    
    // Add new row to table
    defaultTable.rows = defaultTable.rows || [];
    defaultTable.rows.push(newRecord);
    
    // Update database in storage
    database.updated = new Date().toISOString();
    saveDatabase(database)
      .then(() => {
        showNotification("Record added successfully", "success");
        
        // Update the view
        showDatabaseInterface(database);
        
        // Close modal
        closeModal(modal);
      })
      .catch(error => {
        console.error("Error saving database:", error);
        showNotification("Failed to add record", "error");
      });
  });
}

// Helper function to save database list
function saveDatabaseList() {
  // Use the new database storage module to save each database
  appState.databaseList.forEach(db => {
    saveDatabase(db, { silent: true }).catch(error => {
      console.error(`Error saving database ${db.id}:`, error);
    });
  });
}

// Load database list
export function loadDatabaseList() {
  listDatabasesFromStorage({ workspaceId: appState.currentWorkspace?.id })
    .then(databases => {
      appState.databaseList = databases;
      renderDatabaseList();
    })
    .catch(error => {
      console.error("Error loading database list:", error);
    });
}

// Get default columns based on database type
function getDefaultColumns(type) {
  switch (type) {
    case "table":
      return [
        { id: "name", name: "Name", type: "text" },
        { id: "status", name: "Status", type: "select", options: ["Not Started", "In Progress", "Completed"] },
        { id: "due", name: "Due Date", type: "date" }
      ];
    case "list":
      return [
        { id: "name", name: "Name", type: "text" },
        { id: "description", name: "Description", type: "text" }
      ];
    case "kanban":
      return [
        { id: "title", name: "Title", type: "text" },
        { id: "status", name: "Status", type: "select", options: ["To Do", "In Progress", "Done"] },
        { id: "priority", name: "Priority", type: "select", options: ["Low", "Medium", "High"] }
      ];
    case "calendar":
      return [
        { id: "title", name: "Title", type: "text" },
        { id: "date", name: "Date", type: "date" },
        { id: "description", name: "Description", type: "text" }
      ];
    default:
      return [
        { id: "name", name: "Name", type: "text" },
        { id: "value", name: "Value", type: "text" }
      ];
  }
}

// Helper function to get sample data for demonstration
function getSampleData(database, table) {
  // If database has actual data, use that first
  if (database.tables && database.tables.length > 0 && 
      database.tables[0].rows && database.tables[0].rows.length > 0) {
    return database.tables[0].rows;
  }
  
  // Otherwise use sample data
  return sampleTableData[table] || [];
}

// Filter data based on query
function filterData(database, query) {
  // For now, use sample data based on database type
  const table = database.type === "table" ? "tasks" : "people";
  const data = getSampleData(database, table);

  if (!query) return data;

  // Convert query to lowercase for case-insensitive comparison
  const lowerQuery = query.toLowerCase();

  // Filter data based on query
  return data.filter((row) => {
    // Check if any field contains the query
    return Object.values(row).some((value) => {
      return String(value).toLowerCase().includes(lowerQuery);
    });
  });
}
