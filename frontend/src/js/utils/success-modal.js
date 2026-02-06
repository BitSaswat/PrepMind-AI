/**
 * Success Modal Utility
 * Creates and displays beautiful success modals with animations
 */

export function showSuccessModal(title, message, onClose = null, autoDismiss = false) {
  // Create modal HTML
  const modalHTML = `
    <div class="success-modal-overlay" id="successModalOverlay">
      <div class="success-modal">
        <div class="success-icon-wrapper">
          <div class="success-checkmark-simple">
            <div class="checkmark-circle"></div>
            <div class="checkmark-tick">✓</div>
          </div>
        </div>
        <h2>${title}</h2>
        <p>${message}</p>
        <button class="success-modal-btn" id="successModalBtn">Continue</button>
      </div>
    </div>
  `;

  // Remove any existing modal
  const existing = document.getElementById('successModalOverlay');
  if (existing) {
    existing.remove();
  }

  // Insert modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get modal elements
  const overlay = document.getElementById('successModalOverlay');
  const btn = document.getElementById('successModalBtn');

  // Show modal with animation
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Handle close
  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    }, 300);
  };

  // Event listeners
  btn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Auto-dismiss after 3 seconds if enabled (gives time for checkmark animation to complete)
  if (autoDismiss) {
    setTimeout(closeModal, 3000);
  }
}
