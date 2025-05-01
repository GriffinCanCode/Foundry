/**
 * database.js - Database operations and management
 */

import { appState } from '../core/app-core.js';
import { renderDatabaseList } from './ui.js';
import { showNotification } from '../utils/notifications.js';
import { closeModal } from '../utils/modals.js';
import { memoize, Cache } from '../utils/optimizer.js';

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

// Cache for database data
const databaseCache = new Cache(10);

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
    console.log('Creating new database...');
    
    // Show database creation modal
    const modal = document.createElement('div');
    modal.id = 'database-modal';
    modal.className = 'modal fixed inset-0 bg-surface-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
    
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
        modal.classList.add('opacity-100');
        modal.querySelector('.modal-content').classList.add('scale-100');
    }, 10);
    
    // Add event listeners
    document.getElementById('close-database-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('cancel-database-btn').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('create-database-btn').addEventListener('click', () => {
        const name = document.getElementById('database-name').value.trim();
        const type = document.getElementById('database-type').value;
        
        if (!name) {
            showNotification('Please enter a database name', 'error');
            return;
        }
        
        // Create database
        const databaseId = 'db_' + Date.now();
        const database = {
            id: databaseId,
            name: name,
            type: type,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            columns: getDefaultColumns(type),
            rows: []
        };
        
        // Store database in local storage
        const databases = JSON.parse(localStorage.getItem('databases') || '{}');
        databases[databaseId] = database;
        localStorage.setItem('databases', JSON.stringify(databases));
        
        // Clear cache for this database
        databaseCache.delete(databaseId);
        
        showNotification(`Database "${name}" created successfully`, 'success');
        
        // Close modal
        closeModal(modal);
        
        // Add database block to editor
        if (typeof window.addDatabaseBlock === 'function') {
            window.addDatabaseBlock(name);
        }
    });
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

/**
 * Get default columns based on database type
 */
function getDefaultColumns(type) {
    switch (type) {
        case 'table':
            return [
                { id: 'col_1', name: 'Name', type: 'text' },
                { id: 'col_2', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
                { id: 'col_3', name: 'Due Date', type: 'date' }
            ];
        case 'list':
            return [
                { id: 'col_1', name: 'Item', type: 'text' },
                { id: 'col_2', name: 'Completed', type: 'checkbox' }
            ];
        case 'kanban':
            return [
                { id: 'col_1', name: 'Task', type: 'text' },
                { id: 'col_2', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
                { id: 'col_3', name: 'Assignee', type: 'person' }
            ];
        case 'calendar':
            return [
                { id: 'col_1', name: 'Event', type: 'text' },
                { id: 'col_2', name: 'Start Date', type: 'date' },
                { id: 'col_3', name: 'End Date', type: 'date' }
            ];
        default:
            return [
                { id: 'col_1', name: 'Name', type: 'text' },
                { id: 'col_2', name: 'Notes', type: 'text' }
            ];
    }
}

/**
 * Query database with caching
 * @param {string} dbId - Database ID
 * @param {Object} query - Query parameters
 * @returns {Array} - Results
 */
export const queryDatabase = memoize(function(dbId, query = {}) {
    console.log(`Querying database ${dbId} with parameters:`, query);
    
    // Check cache first
    if (databaseCache.has(dbId)) {
        const cachedData = databaseCache.get(dbId);
        console.log(`Using cached data for database ${dbId}`);
        return filterData(cachedData, query);
    }
    
    // Get database from storage
    const databases = JSON.parse(localStorage.getItem('databases') || '{}');
    const database = databases[dbId];
    
    if (!database) {
        console.error(`Database ${dbId} not found`);
        return [];
    }
    
    // Cache the database for future queries (15 minutes TTL)
    databaseCache.set(dbId, database, 15 * 60 * 1000);
    
    // Apply query filters
    return filterData(database, query);
}, (dbId, query) => {
    // Resolver function to generate a unique cache key
    return `${dbId}_${JSON.stringify(query)}`;
});

/**
 * Filter database data based on query
 * @param {Object} database - Database object
 * @param {Object} query - Query parameters
 * @returns {Array} - Filtered rows
 */
function filterData(database, query) {
    // Make a copy of the rows to avoid modifying the original
    let rows = [...database.rows];
    
    // Apply filters if defined
    if (query.filters) {
        query.filters.forEach(filter => {
            rows = rows.filter(row => {
                const value = row[filter.column];
                const filterValue = filter.value;
                
                switch (filter.operator) {
                    case 'equals':
                        return value === filterValue;
                    case 'contains':
                        return typeof value === 'string' && value.includes(filterValue);
                    case 'greater_than':
                        return value > filterValue;
                    case 'less_than':
                        return value < filterValue;
                    default:
                        return true;
                }
            });
        });
    }
    
    // Apply sorting if defined
    if (query.sort) {
        rows.sort((a, b) => {
            const valueA = a[query.sort.column];
            const valueB = b[query.sort.column];
            
            // Handle different data types
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return query.sort.direction === 'asc' 
                    ? valueA.localeCompare(valueB) 
                    : valueB.localeCompare(valueA);
            } else {
                return query.sort.direction === 'asc'
                    ? valueA - valueB
                    : valueB - valueA;
            }
        });
    }
    
    // Apply pagination if defined
    if (query.limit) {
        const start = query.offset || 0;
        rows = rows.slice(start, start + query.limit);
    }
    
    return rows;
}

/**
 * Calculate database statistics - memoized for performance
 * @param {string} dbId - Database ID
 * @returns {Object} - Statistics
 */
export const calculateDatabaseStats = memoize(function(dbId) {
    console.log(`Calculating statistics for database ${dbId}`);
    
    // Get database from storage or cache
    let database;
    if (databaseCache.has(dbId)) {
        database = databaseCache.get(dbId);
    } else {
        const databases = JSON.parse(localStorage.getItem('databases') || '{}');
        database = databases[dbId];
        
        if (!database) {
            console.error(`Database ${dbId} not found`);
            return {
                totalRows: 0,
                columnStats: {}
            };
        }
        
        // Cache the database
        databaseCache.set(dbId, database, 15 * 60 * 1000);
    }
    
    const stats = {
        totalRows: database.rows.length,
        columnStats: {}
    };
    
    // Calculate statistics for each column
    database.columns.forEach(column => {
        const values = database.rows.map(row => row[column.id]);
        
        switch (column.type) {
            case 'number':
                // Calculate numeric stats
                const numValues = values.filter(v => typeof v === 'number');
                stats.columnStats[column.id] = {
                    min: numValues.length ? Math.min(...numValues) : null,
                    max: numValues.length ? Math.max(...numValues) : null,
                    avg: numValues.length ? numValues.reduce((a, b) => a + b, 0) / numValues.length : null,
                    count: numValues.length
                };
                break;
                
            case 'select':
            case 'checkbox':
                // Calculate frequency distribution
                const distribution = {};
                values.forEach(value => {
                    distribution[value] = (distribution[value] || 0) + 1;
                });
                stats.columnStats[column.id] = { distribution };
                break;
                
            case 'date':
                // Find date range
                const dateValues = values.filter(v => v).map(v => new Date(v).getTime());
                stats.columnStats[column.id] = {
                    earliest: dateValues.length ? new Date(Math.min(...dateValues)) : null,
                    latest: dateValues.length ? new Date(Math.max(...dateValues)) : null,
                    count: dateValues.length
                };
                break;
                
            default:
                // Basic stats for other types
                stats.columnStats[column.id] = {
                    count: values.filter(v => v).length,
                    empty: values.filter(v => !v).length
                };
        }
    });
    
    return stats;
}); 