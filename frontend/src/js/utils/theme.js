// ========================================
// ENHANCED THEME TOGGLE WITH SVG ICONS & SMOOTH ANIMATIONS
// ========================================

const THEME_KEY = 'prepmind-theme';

// Get saved theme or default to 'light'
const getSavedTheme = () => {
    return localStorage.getItem(THEME_KEY) || 'light';
};

// Generate Toggle HTML Structure with Beautiful SVG Icons
const createToggleHTML = (theme) => {
    // Beautiful Sun Icon SVG (for light mode - shows when in dark mode)
    const sunIcon = `
        <svg class="toggle-icon sun-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4" fill="currentColor" class="sun-core"/>
            <g class="sun-rays" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </g>
        </svg>
    `;

    // Beautiful Moon Icon SVG (for dark mode - shows when in light mode)
    const moonIcon = `
        <svg class="toggle-icon moon-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path class="moon-shape" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
        </svg>
    `;

    const icon = theme === 'dark' ? sunIcon : moonIcon;

    return `
        <div class="toggle-knob">
            ${icon}
        </div>
    `;
};

// Apply theme to document with smooth transitions
const applyTheme = (theme, skipTransition = false) => {
    // Add loading class to prevent flash on initial load
    if (skipTransition) {
        document.documentElement.classList.add('theme-loading');
    }

    // Apply theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update toggle button HTML if it exists
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = createToggleHTML(theme);
    }

    // Remove loading class after a brief delay
    if (skipTransition) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.documentElement.classList.remove('theme-loading');
            });
        });
    }
};

// Add ripple effect on toggle
const addRippleEffect = (element) => {
    element.classList.add('ripple');
    setTimeout(() => {
        element.classList.remove('ripple');
    }, 600);
};

// Toggle between themes with animations
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // Add ripple effect
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        addRippleEffect(toggleBtn);
    }

    // Apply new theme
    applyTheme(newTheme, false);
};

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = getSavedTheme();

    // Apply theme without transition on initial load
    applyTheme(savedTheme, true);

    // Setup toggle button
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        // Add click event listener
        toggleBtn.addEventListener('click', toggleTheme);

        // Add keyboard support for accessibility
        toggleBtn.setAttribute('role', 'switch');
        toggleBtn.setAttribute('aria-checked', savedTheme === 'dark' ? 'true' : 'false');
        toggleBtn.setAttribute('tabindex', '0');

        toggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
                // Update aria-checked
                const newTheme = document.documentElement.getAttribute('data-theme');
                toggleBtn.setAttribute('aria-checked', newTheme === 'dark' ? 'true' : 'false');
            }
        });
    }
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { toggleTheme, applyTheme, getSavedTheme };
}
