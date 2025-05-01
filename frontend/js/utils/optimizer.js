/**
 * optimizer.js - Performance optimization utilities
 *
 * This file provides utilities to optimize frontend performance:
 * - Debounce: Limit how often a function can be called
 * - Throttle: Ensure a function is called at most once in a specified time period
 * - Memoize: Cache expensive function results for reuse
 * - BatchDOM: Batch DOM operations for better performance
 * - IdleRun: Run non-critical code during browser idle time
 * - FastDOM: DOM manipulation with performance optimizations
 */

/**
 * Debounces a function call, ensuring it's only executed after a specified delay
 * once the user has stopped triggering the event.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - Delay in milliseconds
 * @param {boolean} immediate - If true, trigger function on leading edge instead of trailing
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const context = this;

    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

/**
 * Throttles a function to execute at most once per specified time period.
 *
 * @param {Function} func - The function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  let lastFunc;
  let lastRan;

  return function executedFunction(...args) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);

      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Memoizes a function to cache its results based on input parameters.
 * Best for pure functions with expensive calculations.
 *
 * @param {Function} func - The function to memoize
 * @param {Function} resolver - Function to generate cache key from arguments (optional)
 * @returns {Function} - Memoized function
 */
export function memoize(func, resolver) {
  const cache = new Map();

  return function memoized(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Batches DOM operations for better performance.
 * Uses requestAnimationFrame to optimize DOM changes.
 */
export class BatchDOM {
  constructor() {
    this.queue = [];
    this.pending = false;
  }

  /**
   * Add DOM operation to batch queue
   * @param {Function} operation - Function containing DOM operations
   */
  add(operation) {
    this.queue.push(operation);

    if (!this.pending) {
      this.pending = true;
      requestAnimationFrame(() => this.execute());
    }
  }

  /**
   * Execute all queued DOM operations in a single animation frame
   */
  execute() {
    const operations = this.queue;
    this.queue = [];
    this.pending = false;

    operations.forEach((operation) => {
      try {
        operation();
      } catch (error) {
        console.error("BatchDOM operation error:", error);
      }
    });
  }
}

// Create a singleton instance for app-wide use
export const batchDOM = new BatchDOM();

/**
 * Runs non-critical code during browser idle time.
 *
 * @param {Function} func - Function to run during idle time
 * @param {Object} options - requestIdleCallback options (optional)
 * @returns {number} - The request ID or timeout ID
 */
export function runWhenIdle(func, options = { timeout: 1000 }) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(func, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return setTimeout(
      () => func({ didTimeout: false, timeRemaining: () => 50 }),
      1
    );
  }
}

/**
 * Optimizes event listeners by using event delegation
 *
 * @param {Element} element - Parent element to attach the event
 * @param {string} eventType - Event type like 'click', 'mouseover', etc.
 * @param {string} selector - CSS selector for target elements
 * @param {Function} handler - Event handler function
 */
export function delegateEvent(element, eventType, selector, handler) {
  element.addEventListener(eventType, function (event) {
    const targetElement = event.target.closest(selector);

    if (targetElement && element.contains(targetElement)) {
      handler.call(targetElement, event, targetElement);
    }
  });
}

/**
 * Creates a one-time event listener that removes itself after execution
 *
 * @param {Element} element - Element to attach event to
 * @param {string} eventType - Event type like 'click', 'load', etc.
 * @param {Function} handler - Event handler function
 */
export function once(element, eventType, handler) {
  const wrapper = function (event) {
    handler(event);
    element.removeEventListener(eventType, wrapper);
  };

  element.addEventListener(eventType, wrapper);
}

/**
 * Optimized DOM manipulation utilities
 */
export const FastDOM = {
  /**
   * Create element with attributes and properties in one operation
   * @param {string} tag - Element tag name
   * @param {Object} attrs - Attributes to set
   * @param {string|Node} content - Text content or child node
   * @returns {Element} - The created element
   */
  createElement(tag, attrs = {}, content = "") {
    const element = document.createElement(tag);

    // Set all attributes and properties
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "dataset") {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key === "style" && typeof value === "object") {
        Object.entries(value).forEach(([prop, val]) => {
          element.style[prop] = val;
        });
      } else if (key.startsWith("on") && typeof value === "function") {
        const eventType = key.substring(2).toLowerCase();
        element.addEventListener(eventType, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add content
    if (content) {
      if (typeof content === "string") {
        element.textContent = content;
      } else if (content instanceof Node) {
        element.appendChild(content);
      }
    }

    return element;
  },

  /**
   * Add multiple children to a parent element in one batch operation
   * @param {Element} parent - Parent element
   * @param {Element[]} children - Array of child elements
   * @returns {Element} - The parent element
   */
  appendChildren(parent, children) {
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    children.forEach((child) => fragment.appendChild(child));
    parent.appendChild(fragment);
    return parent;
  },

  /**
   * Set multiple style properties in one operation
   * @param {Element} element - Target element
   * @param {Object} styles - Style properties and values
   * @returns {Element} - The element
   */
  setStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
    return element;
  },

  /**
   * Clear all children from an element faster than innerHTML = ''
   * @param {Element} element - Element to clear
   * @returns {Element} - The cleared element
   */
  clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    return element;
  },
};

/**
 * Simple but efficient in-memory cache
 */
export class Cache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = 0) {
    // Manage cache size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);

    // Set expiry if ttl provided
    if (ttl > 0) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Remove item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }
}
