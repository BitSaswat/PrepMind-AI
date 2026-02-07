/**
 * Loading States Utility
 * Provides reusable functions for managing loading states across the application
 */

// Show loading overlay
export function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('globalLoadingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="spinner" style="margin: 0 auto 16px;"></div>
                <p id="loadingMessage">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const messageEl = overlay.querySelector('#loadingMessage');
    if (messageEl) messageEl.textContent = message;

    // Force reflow before adding active class for smooth transition
    overlay.offsetHeight;
    overlay.classList.add('active');
}

// Hide loading overlay
export function hideLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Remove from DOM after transition
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// Create skeleton loader for a container
export function showSkeletonLoader(container, type = 'card', count = 3) {
    if (!container) return;

    container.innerHTML = '';
    container.classList.add('skeleton-container');

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton-${type}`;
        container.appendChild(skeleton);
    }
}

// Remove skeleton loader
export function hideSkeletonLoader(container) {
    if (!container) return;

    container.classList.remove('skeleton-container');
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
}

// Add loading state to button
export function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `
            <span class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin-right: 8px; display: inline-block; vertical-align: middle;"></span>
            ${loadingText}
        `;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
        button.classList.remove('loading');
        delete button.dataset.originalText;
    }
}

// Add loading state to input field
export function setInputLoading(input, isLoading) {
    if (!input) return;

    if (isLoading) {
        input.disabled = true;
        input.classList.add('loading');
        input.style.opacity = '0.6';
    } else {
        input.disabled = false;
        input.classList.remove('loading');
        input.style.opacity = '1';
    }
}

// Debounce function for performance optimization
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance optimization
export function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Mark page as loaded (removes FOUC)
export function markPageAsLoaded() {
    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    });
}

// Lazy load images
export function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Preload critical resources
export function preloadCriticalResources(urls) {
    urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preload';

        if (url.endsWith('.css')) {
            link.as = 'style';
        } else if (url.endsWith('.js')) {
            link.as = 'script';
        } else if (url.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
            link.as = 'image';
        }

        link.href = url;
        document.head.appendChild(link);
    });
}

// Smooth scroll to element
export function smoothScrollTo(element, offset = 0) {
    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Add fade-in animation to elements
export function fadeInElements(selector, delay = 100) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * delay);
    });
}

// Performance monitoring
export function measurePerformance(name, callback) {
    const start = performance.now();
    const result = callback();
    const end = performance.now();

    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);

    return result;
}

// Async performance monitoring
export async function measurePerformanceAsync(name, callback) {
    const start = performance.now();
    const result = await callback();
    const end = performance.now();

    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);

    return result;
}
