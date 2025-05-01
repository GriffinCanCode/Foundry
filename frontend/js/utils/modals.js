/**
 * modals.js - Modal handling utilities
 */

// Helper function to close modals with animation
export function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    
    const modalContent = modal.querySelector('div > div');
    if (modalContent) {
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
    }
    
    return new Promise(resolve => {
        setTimeout(() => {
            modal.remove();
            resolve();
        }, 300);
    });
} 