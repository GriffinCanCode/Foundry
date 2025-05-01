/**
 * database.js - Database operations and management
 */

import { appState } from '../core/app-core.js';
import { renderDatabaseList } from './ui.js';
import { showNotification } from '../utils/notifications.js';
import { closeModal } from '../utils/modals.js';

// Sample table data to simulate database functionality
const sampleTableData = {
    tasks: [
        { id: 1, name: 'Research topic', status: 'Completed', due: '2023-06-01' },
        { id: 2, name: 'Draft outline', status: 'In Progress', due: '2023-06-10' },
        { id: 3, name: 'Write introduction', status: 'Not Started', due: '2023-06-15' },
        { id: 4, name: 'Create diagrams', status: 'Not Started', due: '2023-06-20' }
    ],
    people: [
        { id: 1, name: 'John Smith', role: 'Project Manager', email: 'john@example.com' },
        { id: 2, name: 'Alice Johnson', role: 'Designer', email: 'alice@example.com' },
        { id: 3, name: 'Bob Wilson', role: 'Developer', email: 'bob@example.com' }
    ],
    notes: [
        { id: 1, title: 'Meeting notes', content: 'Discussed project timeline', date: '2023-05-28' },
        { id: 2, title: 'Research findings', content: 'Key insights from literature review', date: '2023-05-30' }
    ]
};

// View a database
export function viewDatabase(id) {
    // Find database in state
    const database = appState.databaseList.find(db => db.id === id);
    if (!database) {
        showNotification('Database not found', 'error');
        return;
    }
    
    // Show database interface
    showDatabaseInterface(database);
}

// Create a new database
export function createNewDatabase() {
    // Show dialog to create a new database
    showCreateDatabaseDialog();
}

// Show dialog to create a new database
function showCreateDatabaseDialog() {
    // Create modal for creating a database
    const modalHTML = `
    <div id="create-database-modal" class="fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-display font-semibold text-surface-900">Create New Database</h3>
                <button id="close-database-modal" class="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Database Name</label>
                    <input type="text" id="database-name" 
                           class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                           placeholder="My Database">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-surface-700 mb-2">Database Type</label>
                    <select id="database-type" 
                            class="w-full px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white">
                        <option value="tasks">Tasks</option>
                        <option value="people">People</option>
                        <option value="notes">Notes</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                
                <div id="custom-fields-container" class="hidden">
                    <label class="block text-sm font-medium text-surface-700 mb-2">Custom Fields</label>
                    <div class="space-y-2" id="custom-fields">
                        <div class="flex space-x-2">
                            <input type="text" placeholder="Field Name" 
                                   class="flex-grow px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                            <select class="w-40 px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="boolean">Yes/No</option>
                            </select>
                        </div>
                    </div>
                    
                    <button id="add-field-btn" class="mt-2 px-3 py-1.5 text-sm bg-surface-100 text-surface-700 rounded-md hover:bg-surface-200 transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Field
                    </button>
                </div>
                
                <div class="pt-4 flex justify-end space-x-3">
                    <button id="database-cancel-btn" class="px-4 py-2.5 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors">
                        Cancel
                    </button>
                    <button id="database-create-btn" class="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Create
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
    
    const modal = document.getElementById('create-database-modal');
    
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
    
    // Add event listeners
    document.getElementById('close-database-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('database-cancel-btn').addEventListener('click', () => {
        closeModal(modal);
    });
    
    // Show/hide custom fields based on selected type
    document.getElementById('database-type').addEventListener('change', (e) => {
        const customFieldsContainer = document.getElementById('custom-fields-container');
        if (e.target.value === 'custom') {
            customFieldsContainer.classList.remove('hidden');
        } else {
            customFieldsContainer.classList.add('hidden');
        }
    });
    
    // Add field button
    document.getElementById('add-field-btn')?.addEventListener('click', () => {
        const customFields = document.getElementById('custom-fields');
        if (customFields) {
            const fieldRow = document.createElement('div');
            fieldRow.className = 'flex space-x-2';
            fieldRow.innerHTML = `
                <input type="text" placeholder="Field Name" 
                       class="flex-grow px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <select class="w-40 px-4 py-2.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Yes/No</option>
                </select>
                <button class="remove-field-btn p-2 text-surface-400 hover:text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            
            // Add remove button handler
            fieldRow.querySelector('.remove-field-btn').addEventListener('click', () => {
                fieldRow.remove();
            });
            
            customFields.appendChild(fieldRow);
        }
    });
    
    document.getElementById('database-create-btn').addEventListener('click', () => {
        const databaseName = document.getElementById('database-name').value.trim();
        if (!databaseName) {
            // Animate the input to show error
            const input = document.getElementById('database-name');
            input.classList.add('border-red-500', 'ring-2', 'ring-red-200');
            setTimeout(() => {
                input.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
            }, 1000);
            return;
        }
        
        const databaseType = document.getElementById('database-type').value;
        
        // Generate unique ID (in production, this would be from the server)
        const dbId = 'db_' + Date.now();
        
        // Create database object
        const newDatabase = {
            id: dbId,
            name: databaseName,
            type: databaseType,
            tables: {},
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            workspaceId: appState.currentWorkspace?.id
        };
        
        // If using a pre-defined type, set up sample data
        if (databaseType !== 'custom' && sampleTableData[databaseType]) {
            newDatabase.tables[databaseType] = [...sampleTableData[databaseType]];
        } else if (databaseType === 'custom') {
            // Create custom table structure based on field definitions
            const customFields = [];
            document.querySelectorAll('#custom-fields .flex').forEach(fieldRow => {
                const fieldName = fieldRow.querySelector('input').value.trim();
                const fieldType = fieldRow.querySelector('select').value;
                
                if (fieldName) {
                    customFields.push({ name: fieldName, type: fieldType });
                }
            });
            
            // Set up empty custom table if fields are defined
            if (customFields.length > 0) {
                newDatabase.schema = customFields;
                newDatabase.tables.custom = [];
            }
        }
        
        // Add to app state
        appState.databaseList.push(newDatabase);
        
        // Save to local storage
        saveDatabaseList();
        
        // Update UI
        renderDatabaseList();
        
        closeModal(modal);
        showNotification('Database created successfully', 'success');
        
        // Show the database interface
        setTimeout(() => {
            viewDatabase(dbId);
        }, 300);
    });
    
    // Focus the input field
    setTimeout(() => {
        document.getElementById('database-name').focus();
    }, 300);
}

// Show database interface
function showDatabaseInterface(database) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Remember the current editor state
    const editorBackup = document.getElementById('editor')?.innerHTML || '';
    const titleBackup = document.getElementById('document-title')?.textContent || '';
    
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
    localStorage.setItem('foundry_editor_backup', JSON.stringify({
        editorContent: editorBackup,
        documentTitle: titleBackup
    }));
    
    // Replace main content with database view
    mainContent.innerHTML = dbViewHTML;
    
    // Add event listeners
    document.getElementById('close-db-view-btn').addEventListener('click', () => {
        // Restore editor content
        try {
            const backup = JSON.parse(localStorage.getItem('foundry_editor_backup') || '{}');
            
            if (backup.editorContent) {
                mainContent.innerHTML = `
                    <div class="document-header py-4 px-6">
                        <h1 id="document-title" class="text-2xl font-display font-semibold outline-none" contenteditable="true">${backup.documentTitle || 'Untitled'}</h1>
                    </div>
                    <div id="editor" class="editor px-6 py-4 focus:outline-none">
                        ${backup.editorContent}
                    </div>
                `;
            }
        } catch (err) {
            console.error('Error restoring editor state:', err);
            
            // Fallback to empty editor
            mainContent.innerHTML = `
                <div class="document-header py-4 px-6">
                    <h1 id="document-title" class="text-2xl font-display font-semibold outline-none" contenteditable="true">Untitled</h1>
                </div>
                <div id="editor" class="editor px-6 py-4 focus:outline-none"></div>
            `;
            
            // Create a default block
            import('./blocks.js').then(module => {
                module.addBlock('text', '');
            });
        }
    });
    
    document.getElementById('add-record-btn').addEventListener('click', () => {
        addNewRecord(database);
    });
}

// Get table headers for the database view
function getTableHeaders(database) {
    const tableType = database.type;
    
    if (tableType === 'tasks') {
        return `
            <th class="px-4 py-3 text-left font-medium">Task</th>
            <th class="px-4 py-3 text-left font-medium">Status</th>
            <th class="px-4 py-3 text-left font-medium">Due Date</th>
            <th class="px-4 py-3 text-left font-medium">Actions</th>
        `;
    } else if (tableType === 'people') {
        return `
            <th class="px-4 py-3 text-left font-medium">Name</th>
            <th class="px-4 py-3 text-left font-medium">Role</th>
            <th class="px-4 py-3 text-left font-medium">Email</th>
            <th class="px-4 py-3 text-left font-medium">Actions</th>
        `;
    } else if (tableType === 'notes') {
        return `
            <th class="px-4 py-3 text-left font-medium">Title</th>
            <th class="px-4 py-3 text-left font-medium">Content</th>
            <th class="px-4 py-3 text-left font-medium">Date</th>
            <th class="px-4 py-3 text-left font-medium">Actions</th>
        `;
    } else if (tableType === 'custom' && database.schema) {
        // Custom table with schema
        let headers = '';
        database.schema.forEach(field => {
            headers += `<th class="px-4 py-3 text-left font-medium">${field.name}</th>`;
        });
        return headers + `<th class="px-4 py-3 text-left font-medium">Actions</th>`;
    }
    
    // Default empty header
    return '<th class="px-4 py-3 text-left font-medium">No data available</th>';
}

// Get table rows for the database view
function getTableRows(database) {
    const tableType = database.type;
    const tableData = database.tables[tableType] || [];
    
    if (tableData.length === 0) {
        return `
            <tr>
                <td colspan="4" class="px-4 py-8 text-center text-surface-500">
                    No records found. Click "Add Record" to create one.
                </td>
            </tr>
        `;
    }
    
    if (tableType === 'tasks') {
        return tableData.map(task => `
            <tr class="border-t border-surface-200 hover:bg-surface-50">
                <td class="px-4 py-3">${task.name}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-surface-100 text-surface-800'
                    }">${task.status}</span>
                </td>
                <td class="px-4 py-3 text-sm">${task.due}</td>
                <td class="px-4 py-3">
                    <button class="p-1 text-surface-400 hover:text-surface-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } else if (tableType === 'people') {
        return tableData.map(person => `
            <tr class="border-t border-surface-200 hover:bg-surface-50">
                <td class="px-4 py-3">${person.name}</td>
                <td class="px-4 py-3">${person.role}</td>
                <td class="px-4 py-3"><a href="mailto:${person.email}" class="text-primary-600 hover:underline">${person.email}</a></td>
                <td class="px-4 py-3">
                    <button class="p-1 text-surface-400 hover:text-surface-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } else if (tableType === 'notes') {
        return tableData.map(note => `
            <tr class="border-t border-surface-200 hover:bg-surface-50">
                <td class="px-4 py-3">${note.title}</td>
                <td class="px-4 py-3 truncate max-w-xs">${note.content}</td>
                <td class="px-4 py-3 text-sm">${note.date}</td>
                <td class="px-4 py-3">
                    <button class="p-1 text-surface-400 hover:text-surface-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } else if (tableType === 'custom' && database.schema) {
        // Custom table with schema
        return tableData.map(record => {
            let cells = '';
            database.schema.forEach(field => {
                cells += `<td class="px-4 py-3">${record[field.name] || ''}</td>`;
            });
            
            return `
                <tr class="border-t border-surface-200 hover:bg-surface-50">
                    ${cells}
                    <td class="px-4 py-3">
                        <button class="p-1 text-surface-400 hover:text-surface-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    return '';
}

// Add a new record to the database
function addNewRecord(database) {
    const tableType = database.type;
    
    // Define default record based on table type
    let newRecord;
    let highestId = 0;
    
    // Find highest current ID
    if (database.tables[tableType]) {
        database.tables[tableType].forEach(record => {
            if (record.id > highestId) highestId = record.id;
        });
    }
    
    // Create new record with incremented ID
    if (tableType === 'tasks') {
        newRecord = {
            id: highestId + 1,
            name: 'New task',
            status: 'Not Started',
            due: new Date().toISOString().split('T')[0] // Today's date
        };
    } else if (tableType === 'people') {
        newRecord = {
            id: highestId + 1,
            name: 'New person',
            role: 'Role',
            email: 'email@example.com'
        };
    } else if (tableType === 'notes') {
        newRecord = {
            id: highestId + 1,
            title: 'New note',
            content: 'Note content',
            date: new Date().toISOString().split('T')[0] // Today's date
        };
    } else if (tableType === 'custom' && database.schema) {
        newRecord = { id: highestId + 1 };
        database.schema.forEach(field => {
            // Set default values based on field type
            switch (field.type) {
                case 'text':
                    newRecord[field.name] = 'New entry';
                    break;
                case 'number':
                    newRecord[field.name] = 0;
                    break;
                case 'date':
                    newRecord[field.name] = new Date().toISOString().split('T')[0];
                    break;
                case 'boolean':
                    newRecord[field.name] = false;
                    break;
                default:
                    newRecord[field.name] = '';
            }
        });
    }
    
    // Add new record to the database
    if (newRecord) {
        if (!database.tables[tableType]) {
            database.tables[tableType] = [];
        }
        
        database.tables[tableType].push(newRecord);
        
        // Update timestamp
        database.updated = new Date().toISOString();
        
        // Save database list
        saveDatabaseList();
        
        // Refresh the view
        viewDatabase(database.id);
        
        showNotification('Record added', 'success');
    }
}

// Save database list to local storage
function saveDatabaseList() {
    try {
        localStorage.setItem(
            `foundry_databases_${appState.currentWorkspace?.id || 'default'}`, 
            JSON.stringify(appState.databaseList)
        );
    } catch (err) {
        console.error('Error saving databases:', err);
        showNotification('Failed to save databases', 'error');
    }
}

// Load database list from local storage
export function loadDatabaseList() {
    try {
        const databases = localStorage.getItem(
            `foundry_databases_${appState.currentWorkspace?.id || 'default'}`
        );
        if (databases) {
            appState.databaseList = JSON.parse(databases);
            renderDatabaseList();
        } else {
            appState.databaseList = [];
        }
    } catch (err) {
        console.error('Error loading databases:', err);
        appState.databaseList = [];
    }
} 