/**
 * notifications.js - Notification system
 */

import { throttle } from './optimizer.js';

let notificationCounter = 0;
const activeNotifications = new Set();
const MAX_NOTIFICATIONS = 3;

/**
 * Show a notification message
 * 
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'info', 'success', 'warning', 'error'
 * @param {number} duration - How long to show the notification (in ms)
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Delegate to the throttled implementation
    throttledShowNotification(message, type, duration);
}

/**
 * Throttled implementation of the notification display
 * This prevents too many notifications from being created in a short period
 */
const throttledShowNotification = throttle((message, type = 'info', duration = 3000) => {
    // Check if too many notifications are already visible
    if (activeNotifications.size >= MAX_NOTIFICATIONS) {
        // Remove the oldest notification to make room
        const oldestId = Array.from(activeNotifications)[0];
        const oldNotification = document.getElementById(`notification-${oldestId}`);
        if (oldNotification) {
            removeNotification(oldestId);
        }
    }
    
    // Create a unique ID for this notification
    const notificationId = notificationCounter++;
    
    // Track this notification as active
    activeNotifications.add(notificationId);
    
    // Create the notification element
    const notification = document.createElement('div');
    notification.id = `notification-${notificationId}`;
    notification.className = `notification fixed flex items-center p-4 rounded-lg shadow-lg transition-all transform duration-300 ease-in-out z-50 opacity-0 translate-y-4`;
    
    // Position at top-right corner, stacked from top to bottom
    notification.style.top = `${20 + (activeNotifications.size - 1) * 80}px`;
    notification.style.right = '20px';
    notification.style.maxWidth = '320px';
    
    // Set type-specific styles
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-50', 'text-green-800', 'border-l-4', 'border-green-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-50', 'text-yellow-800', 'border-l-4', 'border-yellow-500');
            break;
        case 'error':
            notification.classList.add('bg-red-50', 'text-red-800', 'border-l-4', 'border-red-500');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-50', 'text-blue-800', 'border-l-4', 'border-blue-500');
            break;
    }
    
    // Create icon based on notification type
    let iconSvg = '';
    switch (type) {
        case 'success':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>`;
            break;
        case 'warning':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>`;
            break;
        case 'error':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>`;
            break;
        case 'info':
        default:
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>`;
            break;
    }
    
    // Set notification content
    notification.innerHTML = `
        <div class="flex items-center">
            ${iconSvg}
            <div class="flex-grow">${message}</div>
            <button class="ml-4 text-surface-500 hover:text-surface-800 transition-colors" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    `;
    
    // Add the notification to the DOM
    document.body.appendChild(notification);
    
    // Trigger animation to fade in
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-y-4');
    }, 10);
    
    // Set up close button
    notification.querySelector('button').addEventListener('click', () => {
        removeNotification(notificationId);
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        removeNotification(notificationId);
    }, duration);
}, 300); // Throttle to prevent too many notifications at once

/**
 * Remove a notification by its ID
 */
function removeNotification(id) {
    const notification = document.getElementById(`notification-${id}`);
    if (!notification) return;
    
    // Animate out
    notification.classList.add('opacity-0', 'translate-x-full');
    
    // Remove after animation completes
    setTimeout(() => {
        notification.remove();
        
        // Remove from active set
        activeNotifications.delete(id);
        
        // Reposition remaining notifications
        repositionNotifications();
    }, 300);
}

/**
 * Reposition notifications after one is removed
 */
function repositionNotifications() {
    const notifications = document.querySelectorAll('[id^="notification-"]');
    notifications.forEach((notification, index) => {
        notification.style.top = `${20 + index * 80}px`;
    });
} 