/**
 * Info Modal Utility
 * Creates and displays beautiful info modals for "coming soon" and other messages
 */

export function showInfoModal(title, message, onClose = null) {
  // Create modal HTML
  const modalHTML = `
    <div class="info-modal-overlay" id="infoModalOverlay">
      <div class="info-modal">
        <div class="info-icon-wrapper">
          <div class="info-icon"></div>
        </div>
        <h2>${title}</h2>
        <p>${message}</p>
        <button class="info-modal-btn" id="infoModalBtn">Got it!</button>
      </div>
    </div>
  `;

  // Remove any existing modal
  const existing = document.getElementById('infoModalOverlay');
  if (existing) {
    existing.remove();
  }

  // Insert modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get modal elements
  const overlay = document.getElementById('infoModalOverlay');
  const btn = document.getElementById('infoModalBtn');

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

  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}
