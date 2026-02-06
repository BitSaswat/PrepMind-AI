/**
 * Toast Notification Utility
 * Creates lightweight toast notifications for quick messages
 */

export function showToast(message, type = 'error', duration = 3000) {
  // Ensure toast container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast HTML
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;

  // Add to container
  container.appendChild(toast);

  // Show toast with animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.transform = 'translateX(400px) scale(0.8)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      // Remove container if empty
      if (container.children.length === 0) {
        container.remove();
      }
    }, 400); // Match transition duration
  }, duration);
}
