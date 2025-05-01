/**
 * notifications.js - Notification system
 */

// Display a notification with different types and auto-dismiss
export function showNotification(message, type = 'success', duration = 3000) {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed bottom-4 right-4 flex flex-col items-end space-y-2 z-50';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element with improved styling
    const notification = document.createElement('div');
    notification.className = `px-6 py-3 rounded-lg shadow-lg flex items-center ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'warning' ? 'bg-yellow-500 text-white' : 
        'bg-primary-500 text-white'
    } transform translate-y-0 opacity-0 transition-all duration-300`;
    
    // Add icon based on notification type
    let icon = '';
    switch (type) {
        case 'success':
            icon = `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
            break;
        case 'error':
            icon = `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
            break;
        case 'warning':
            icon = `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>`;
            break;
        default:
            icon = `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
    }
    
    notification.innerHTML = `
        ${icon}
        <span class="font-medium">${message}</span>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Animate in - using setTimeout for the animation to trigger properly
    setTimeout(() => {
        notification.classList.remove('opacity-0');
        notification.classList.add('opacity-100');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        notification.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            notificationContainer.removeChild(notification);
            
            // Remove container if empty
            if (notificationContainer.children.length === 0) {
                document.body.removeChild(notificationContainer);
            }
        }, 300);
    }, duration);
} 