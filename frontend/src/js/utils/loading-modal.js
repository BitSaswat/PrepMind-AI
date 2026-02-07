/**
 * Loading Modal Utility
 * Beautiful loading states with progress tracking
 * Matches existing design system with Apple-quality animations
 */

let loadingOverlay = null;
let loadingModal = null;
let currentProgress = 0;

/**
 * Initialize loading modal HTML structure
 */
function initLoadingModal() {
    if (loadingOverlay) return; // Already initialized

    // Create overlay
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-modal-overlay';

    // Create modal
    loadingModal = document.createElement('div');
    loadingModal.className = 'loading-modal';

    loadingModal.innerHTML = `
    <div class="loading-spinner-wrapper">
      <div class="loading-spinner"></div>
    </div>
    <div class="loading-progress">
      <div class="loading-progress-bar" id="loadingProgressBar"></div>
    </div>
    <h2 id="loadingTitle">Loading...</h2>
    <p id="loadingMessage">Please wait</p>
    <div class="loading-status" id="loadingStatus"></div>
    <div class="loading-modal-actions" id="loadingActions" style="display: none;"></div>
  `;

    loadingOverlay.appendChild(loadingModal);
    document.body.appendChild(loadingOverlay);
}

/**
 * Show loading modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {number} estimatedDuration - Estimated duration in ms (for progress simulation)
 */
export function showLoadingModal(title = 'Loading...', message = 'Please wait', estimatedDuration = 8000) {
    initLoadingModal();

    // Reset state
    loadingModal.className = 'loading-modal';
    currentProgress = 0;

    // Set content
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingStatus').textContent = '';
    document.getElementById('loadingActions').style.display = 'none';

    // Reset progress bar
    const progressBar = document.getElementById('loadingProgressBar');
    progressBar.style.width = '0%';

    // Show modal
    requestAnimationFrame(() => {
        loadingOverlay.classList.add('active');
    });

    // Simulate progress (smooth animation)
    if (estimatedDuration > 0) {
        simulateProgress(estimatedDuration);
    }
}

/**
 * Update loading modal content
 * @param {string} title - New title
 * @param {string} message - New message
 * @param {number} progress - Progress percentage (0-100)
 */
export function updateLoadingModal(title, message, progress = null) {
    if (!loadingModal) return;

    if (title) {
        document.getElementById('loadingTitle').textContent = title;
    }

    if (message) {
        document.getElementById('loadingMessage').textContent = message;
    }

    if (progress !== null) {
        setProgress(progress);
    }
}

/**
 * Set progress percentage
 * @param {number} percent - Progress percentage (0-100)
 */
export function setProgress(percent) {
    if (!loadingModal) return;

    currentProgress = Math.min(100, Math.max(0, percent));
    const progressBar = document.getElementById('loadingProgressBar');
    progressBar.style.width = `${currentProgress}%`;
}

/**
 * Set status text
 * @param {string} status - Status text
 */
export function setLoadingStatus(status) {
    if (!loadingModal) return;
    document.getElementById('loadingStatus').textContent = status;
}

/**
 * Simulate smooth progress animation
 * @param {number} duration - Duration in ms
 */
function simulateProgress(duration) {
    const startTime = Date.now();
    const interval = 50; // Update every 50ms

    const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(95, (elapsed / duration) * 100); // Cap at 95% until complete

        setProgress(progress);

        if (progress < 95 && loadingOverlay.classList.contains('active')) {
            setTimeout(updateProgress, interval);
        }
    };

    updateProgress();
}

/**
 * Hide loading modal
 */
export function hideLoadingModal() {
    if (!loadingOverlay) return;

    loadingOverlay.classList.remove('active');

    // Clean up after animation
    setTimeout(() => {
        if (loadingOverlay && loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
            loadingOverlay = null;
            loadingModal = null;
        }
    }, 350); // Match CSS transition duration
}

/**
 * Show success modal
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @param {number} autoHideDuration - Auto hide after ms (0 = manual close)
 */
export function showSuccessModal(title = 'Success!', message = 'Operation completed successfully', autoHideDuration = 2000) {
    initLoadingModal();

    // Set success state
    loadingModal.className = 'loading-modal success';
    setProgress(100);

    // Set content
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingStatus').textContent = '';

    // Show modal
    requestAnimationFrame(() => {
        loadingOverlay.classList.add('active');
    });

    // Auto hide
    if (autoHideDuration > 0) {
        setTimeout(() => {
            hideLoadingModal();
        }, autoHideDuration);
    } else {
        // Show close button
        showActionButtons([
            { text: 'Close', onClick: hideLoadingModal, primary: true }
        ]);
    }
}

/**
 * Show error modal
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Function} onRetry - Optional retry callback
 */
export function showErrorModal(title = 'Error', message = 'Something went wrong', onRetry = null) {
    initLoadingModal();

    // Set error state
    loadingModal.className = 'loading-modal error';
    setProgress(0);

    // Set content
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingStatus').textContent = '';

    // Show modal
    requestAnimationFrame(() => {
        loadingOverlay.classList.add('active');
    });

    // Show action buttons
    const buttons = [
        { text: 'Close', onClick: hideLoadingModal, primary: false }
    ];

    if (onRetry) {
        buttons.unshift({ text: 'Retry', onClick: onRetry, primary: true });
    }

    showActionButtons(buttons);
}

/**
 * Show action buttons
 * @param {Array} buttons - Array of {text, onClick, primary}
 */
function showActionButtons(buttons) {
    const actionsContainer = document.getElementById('loadingActions');
    actionsContainer.innerHTML = '';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `loading-modal-btn ${btn.primary ? '' : 'secondary'}`;
        button.textContent = btn.text;
        button.onclick = btn.onClick;
        actionsContainer.appendChild(button);
    });

    actionsContainer.style.display = 'flex';
}

/**
 * Show loading with stages
 * @param {Array} stages - Array of {title, message, duration}
 */
export async function showLoadingStages(stages) {
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const progress = ((i + 1) / stages.length) * 100;

        if (i === 0) {
            showLoadingModal(stage.title, stage.message, stage.duration || 3000);
        } else {
            updateLoadingModal(stage.title, stage.message, progress);
        }

        setLoadingStatus(`Step ${i + 1} of ${stages.length}`);

        if (stage.duration) {
            await new Promise(resolve => setTimeout(resolve, stage.duration));
        }
    }
}
