// Brand logo navigation handler
// Redirects to appropriate page based on authentication status

import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showToast } from './toast.js';

// Store auth state
let isUserLoggedIn = false;
let authStateReady = false;

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
    isUserLoggedIn = !!user;
    authStateReady = true;
});

// Initialize brand logo click handler
export function initBrandNavigation() {
    const brandElements = document.querySelectorAll('.brand');

    brandElements.forEach(brand => {
        brand.style.cursor = 'pointer';

        brand.addEventListener('click', async (e) => {
            // RESTRICTION CHECK: Prevent navigation on critical pages
            const currentPath = window.location.pathname;
            const isRestrictedPage = currentPath.includes('onboarding.html') || currentPath.includes('live-test.html');
            const isInterviewActive = document.querySelector('.interview-modal-overlay.active'); // Check for active interview modal

            if (isRestrictedPage || isInterviewActive) {
                e.preventDefault();
                e.stopPropagation();

                // Show warning
                if (typeof showToast === 'function') {
                    showToast('Action disabled during live session', 'warning');
                } else {
                    console.warn('Navigation disabled: Live session active');
                    // Fallback alert if toast fails or isn't loaded
                    alert('You cannot leave this page during a live session.');
                }
                return;
            }

            // Wait for auth state to be ready if not already
            if (!authStateReady) {
                await new Promise((resolve) => {
                    const unsubscribe = onAuthStateChanged(auth, (user) => {
                        isUserLoggedIn = !!user;
                        authStateReady = true;
                        unsubscribe();
                        resolve();
                    });
                });
            }

            if (isUserLoggedIn) {
                // Logged in - redirect to dashboard
                window.location.href = getRelativePath('dashboard.html');
            } else {
                // Not logged in - redirect to index
                window.location.href = getRelativePath('index.html');
            }
        });
    });
}

// Helper function to get relative path based on current location
// Helper function to get relative path based on current location
function getRelativePath(targetPage) {
    const currentPath = window.location.pathname;

    // Check if we are in the root directory (e.g., /index.html or /)
    const isRoot = currentPath.endsWith('index.html') || currentPath.endsWith('/') || !currentPath.includes('/src/pages/');

    if (isRoot) {
        if (targetPage === 'index.html') return 'index.html';
        return `src/pages/${targetPage}`;
    } else {
        // We are inside src/pages/ (or a subdirectory of it)
        if (targetPage === 'index.html') return '../../index.html';
        return targetPage; // Already in pages/ so just return 'dashboard.html' etc.
    }
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrandNavigation);
} else {
    initBrandNavigation();
}
