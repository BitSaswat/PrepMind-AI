// Brand logo navigation handler
// Redirects to appropriate page based on authentication status

import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

        brand.addEventListener('click', async () => {
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
function getRelativePath(targetPage) {
    const currentPath = window.location.pathname;

    // If we're on index.html or at root
    if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
        if (targetPage === 'index.html') {
            return 'index.html';
        }
        return `src/pages/${targetPage}`;
    }

    // If we're in /src/pages/
    if (currentPath.includes('/src/pages/')) {
        if (targetPage === 'index.html') {
            return '../../index.html';
        }
        return targetPage;
    }

    // Default fallback
    return targetPage;
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrandNavigation);
} else {
    initBrandNavigation();
}
