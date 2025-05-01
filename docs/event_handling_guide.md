# Event Handling Best Practices in Foundry

## Sidebar Toggle Button Fix - Case Study

### The Problem

The sidebar toggle functionality had inconsistent behavior:
- The emergency toggle button worked correctly
- The regular sidebar toggle button (`#sidebar-toggle`) didn't function
- The fixed sidebar toggle button (`#sidebar-toggle-fixed`) worked inconsistently

### Root Causes

1. **Mixed Event Binding Methods**: Using both HTML `onclick` attributes and JavaScript event listeners
2. **Multiple Initializations**: Setting up event handlers in multiple places
3. **Direct Property Assignment**: Using `element.onclick = function() {}` instead of `addEventListener`
4. **Closure Issues**: Not using proper function references

### Solution Approach

The solution focused on standardizing the event handling approach with these principles:

1. Remove inline HTML `onclick` attributes
2. Use consistent event listener approach with `addEventListener`
3. Export setup functions to ensure they can be called from various entry points
4. Prevent duplicate listeners by removing existing ones before adding new ones

### Implementation Details

#### 1. Remove inline HTML onclick attributes

```html
<!-- Before -->
<button id="sidebar-toggle-fixed" class="sidebar-toggle-fixed" onclick="console.log('Direct HTML onclick triggered')">
    <i data-lucide="chevron-right"></i>
</button>

<!-- After -->
<button id="sidebar-toggle-fixed" class="sidebar-toggle-fixed">
    <i data-lucide="chevron-right"></i>
</button>
```

#### 2. Standardize event listener setup

```javascript
// Create a consistent setup function
export function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleFixed = document.getElementById('sidebar-toggle-fixed');
    
    // Create a single reusable function to handle sidebar toggle
    const toggleSidebarFn = function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    };
    
    if (sidebarToggle) {
        // Remove any existing listeners to prevent duplicates
        sidebarToggle.removeEventListener('click', toggleSidebarFn);
        // Add the click listener
        sidebarToggle.addEventListener('click', toggleSidebarFn);
        // Clear any direct onclick property to avoid conflicts
        sidebarToggle.onclick = null;
    }
    
    // Apply the same pattern to other elements
    if (sidebarToggleFixed) {
        sidebarToggleFixed.removeEventListener('click', toggleSidebarFn);
        sidebarToggleFixed.addEventListener('click', toggleSidebarFn);
        sidebarToggleFixed.onclick = null;
    }
}
```

#### 3. Use consistent initialization

```javascript
// In index.js
import { setupSidebarToggle } from './modules/ui.js';

// Initialize toggle buttons using proper module functions
await import('./modules/ui.js').then(uiModule => {
    uiModule.setupSidebarToggle();
    uiModule.setupSidebarToggleFixed();
});
```

## Best Practices for Event Handling in Foundry

### 1. Avoid Inline Event Handlers

Don't use inline `onclick` attributes in HTML:

```html
<!-- Avoid this -->
<button onclick="doSomething()">Click Me</button>

<!-- Do this instead - use IDs or classes for JavaScript targeting -->
<button id="my-button">Click Me</button>
```

### 2. Centralize Event Setup

Create dedicated setup functions that can be exported and called from initialization points:

```javascript
// In a module file (e.g., ui.js)
export function setupButtonEvents() {
    const button = document.getElementById('my-button');
    if (button) {
        const clickHandler = (e) => {
            e.preventDefault();
            // Handle click
        };
        
        // Remove existing listener if any
        button.removeEventListener('click', clickHandler);
        // Add new listener
        button.addEventListener('click', clickHandler);
    }
}

// In the main file (e.g., index.js)
import { setupButtonEvents } from './modules/ui.js';
setupButtonEvents();
```

### 3. Prevent Duplicate Event Listeners

Always remove existing listeners before adding new ones, especially for functions that might be called multiple times:

```javascript
function setupListener(element, eventType, handler) {
    if (!element) return;
    
    // Remove existing listener
    element.removeEventListener(eventType, handler);
    // Add new listener
    element.addEventListener(eventType, handler);
    // Clear direct property assignment if it exists
    element[`on${eventType}`] = null;
}
```

### 4. Use Event Delegation for Dynamic Elements

For elements that are added dynamically, use event delegation:

```javascript
document.getElementById('container').addEventListener('click', function(e) {
    // Check if clicked element or its parent matches your selector
    if (e.target.matches('.dynamic-button') || e.target.closest('.dynamic-button')) {
        // Handle click for dynamic buttons
    }
});
```

### 5. Clean Up Event Listeners When Components Are Removed

Prevent memory leaks by removing event listeners when elements are removed:

```javascript
function destroyComponent() {
    const button = document.getElementById('my-button');
    if (button) {
        button.removeEventListener('click', clickHandler);
    }
}
```

### 6. Prefer Named Functions for Event Handlers

Use named functions instead of anonymous functions to make removal easier:

```javascript
// Define handler outside
function handleClick(e) {
    e.preventDefault();
    // Handle click
}

// Add and remove as needed
element.addEventListener('click', handleClick);
element.removeEventListener('click', handleClick);
```

By following these practices consistently, Foundry will maintain reliable event handling across all interactive elements. 