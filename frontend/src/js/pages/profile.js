import { auth } from '../config/firebase-config.js';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showSuccessModal } from '../utils/success-modal.js';
import { showToast } from '../utils/toast.js';

const db = getFirestore();

let currentUser = null;
let currentUserData = null;

// Helper to show floating messages
const showMessage = (element, message, type) => {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
};

// --- AUTH LISTENER ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../pages/login.html';
    return;
  }
  currentUser = user;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      currentUserData = userDoc.data();
      loadProfileData(user, currentUserData);
      setupEventListeners(user, currentUserData);
    } else {
      console.log("No user document found");
      window.location.href = '../pages/onboarding.html';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
});

// --- RENDER PROFILE ---
function loadProfileData(user, userData) {
  const displayName = userData.fullName || user.displayName || 'Student';
  const firstChar = displayName.charAt(0).toUpperCase();

  // 1. Fill Text Fields
  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  safeSetText('profileName', displayName);
  safeSetText('profileEmail', user.email);
  safeSetText('viewFullName', displayName);
  safeSetText('viewEmail', user.email);
  safeSetText('viewTargetExam', userData.targetExam || '-');
  safeSetText('viewEducationLevel', userData.educationLevel || '-');
  safeSetText('viewTargetYear', userData.targetYear || '-');
  safeSetText('viewStudyHours', userData.studyHours || '-');
  safeSetText('viewPreferredLanguage', userData.preferredLanguage || '-');

  if (userData.createdAt) {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    safeSetText('viewMemberSince', new Date(userData.createdAt).toLocaleDateString('en-US', dateOptions));
  }

  // 2. Avatar Logic (Base64 Priority)
  const profileAvatarDisplay = document.getElementById('profileAvatarDisplay'); // The big circle
  const userAvatar = document.getElementById('userAvatar'); // The nav circle

  // Check for 'photoBase64' (Database Image) FIRST, then standard 'photoURL' (Google)
  let photoSource = userData.photoBase64 || user.photoURL;

  if (photoSource) {
    // Apply Image
    const style = `url('${photoSource}')`;

    if (profileAvatarDisplay) {
      profileAvatarDisplay.textContent = '';
      profileAvatarDisplay.style.backgroundImage = style;
      profileAvatarDisplay.style.backgroundSize = 'cover';
      profileAvatarDisplay.style.backgroundPosition = 'center';
    }
    if (userAvatar) {
      userAvatar.textContent = '';
      userAvatar.style.backgroundImage = style;
      userAvatar.style.backgroundSize = 'cover';
      userAvatar.style.backgroundPosition = 'center';
    }
  } else {
    // Fallback to Initial + Gradient
    if (profileAvatarDisplay) {
      profileAvatarDisplay.style.backgroundImage = ''; // Reset to CSS gradient
      profileAvatarDisplay.textContent = firstChar;
    }
    if (userAvatar) {
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = firstChar;
    }
  }

  const profileExamBadge = document.getElementById('profileExamBadge');
  if (profileExamBadge) {
    profileExamBadge.textContent = `${userData.targetExam || 'JEE'} ${userData.targetYear || '2026'}`;
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners(user, userData) {
  if (window.listenersAttached) return;
  window.listenersAttached = true;

  // Navigation
  document.getElementById('dashboardBtn')?.addEventListener('click', () => window.location.href = '../pages/dashboard.html');
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = '../../index.html';
  });

  // Edit Profile Logic
  document.getElementById('editProfileBtn')?.addEventListener('click', () => enterEditMode(user, currentUserData));
  document.getElementById('cancelEditBtn')?.addEventListener('click', exitEditMode);

  document.getElementById('profileEditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfileChanges();
  });

  // --- AVATAR UPLOAD LOGIC (Base64) ---
  const avatarTrigger = document.getElementById('avatarUploadTrigger');
  const fileInput = document.getElementById('profilePicInput');

  if (avatarTrigger && fileInput) {
    avatarTrigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];

      // Reset input to allow selecting the same file again
      e.target.value = '';

      if (!file) return;

      // Limit generic file size (5MB max before compression)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Please select an image under 5MB.', 'error');
        return;
      }

      await processAndUploadImage(file);
    });
  }

  setupDeleteLogic();
}

// --- COMPRESS & SAVE IMAGE (No Storage Bucket Needed) ---
async function processAndUploadImage(file) {
  const profileAvatarDisplay = document.getElementById('profileAvatarDisplay');
  const oldText = profileAvatarDisplay.textContent;
  const oldImage = profileAvatarDisplay.style.backgroundImage;

  // 1. Loading State
  profileAvatarDisplay.textContent = '...';
  profileAvatarDisplay.style.backgroundImage = 'none';
  profileAvatarDisplay.style.opacity = '0.7';

  try {
    // 2. Compress Image (Crucial for Firestore limit)
    // We convert the image to a small text string
    const base64String = await resizeImage(file);

    // 3. Save DIRECTLY to Firestore User Document
    // We use a field 'photoBase64' to store the image string
    await updateDoc(doc(db, 'users', currentUser.uid), {
      photoBase64: base64String
    });

    // 4. Update Local State
    currentUserData.photoBase64 = base64String;

    // 5. Refresh UI Immediately
    loadProfileData(currentUser, currentUserData);

    // Show custom success message with auto-dismiss
    showSuccessModal(
      'Profile Picture Updated! 📸',
      'Your new profile picture has been saved successfully.',
      null,
      true // Auto-dismiss after 3 seconds
    );

  } catch (error) {
    console.error("Image processing failed:", error);
    showToast('Failed to update image. Please try a smaller file.', 'error');
    // Revert on error
    profileAvatarDisplay.textContent = oldText;
    profileAvatarDisplay.style.backgroundImage = oldImage;
  } finally {
    profileAvatarDisplay.style.opacity = '1';
  }
}

// Helper: Resize Image (prevents "File too large" DB errors)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Max dimensions (300x300 is perfect for avatars)
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Base64 (JPEG at 70% quality for small text size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// --- EDIT MODES ---
function enterEditMode(user, userData) {
  document.getElementById('profileView').style.display = 'none';
  document.getElementById('profileEdit').style.display = 'block';
  document.getElementById('editProfileBtn').style.display = 'none';

  document.getElementById('editFullName').value = userData.fullName || user.displayName || '';
  document.getElementById('editEmail').value = user.email;
  document.getElementById('editTargetExam').value = userData.targetExam || 'JEE';
  document.getElementById('editEducationLevel').value = userData.educationLevel || '12th';
  document.getElementById('editTargetYear').value = userData.targetYear || '2026';
  document.getElementById('editStudyHours').value = userData.studyHours || '2-4';
  document.getElementById('editPreferredLanguage').value = userData.preferredLanguage || 'English';
}

function exitEditMode() {
  document.getElementById('profileView').style.display = 'block';
  document.getElementById('profileEdit').style.display = 'none';
  document.getElementById('editProfileBtn').style.display = 'flex';
}

async function saveProfileChanges() {
  const btn = document.querySelector('#profileEditForm .btn-save');
  const msg = document.getElementById('profileMessage');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const newData = {
      fullName: document.getElementById('editFullName').value,
      targetExam: document.getElementById('editTargetExam').value,
      educationLevel: document.getElementById('editEducationLevel').value,
      targetYear: document.getElementById('editTargetYear').value,
      studyHours: document.getElementById('editStudyHours').value,
      preferredLanguage: document.getElementById('editPreferredLanguage').value,
    };

    await updateDoc(doc(db, 'users', currentUser.uid), newData);

    if (newData.fullName !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: newData.fullName });
    }

    currentUserData = { ...currentUserData, ...newData };

    // Show success modal
    showSuccessModal(
      'Profile Updated! 🎉',
      'Your changes have been saved successfully.',
      () => {
        loadProfileData(currentUser, currentUserData);
        exitEditMode();
        btn.textContent = 'Save Changes';
        btn.disabled = false;
      }
    );

  } catch (e) {
    console.error(e);
    showMessage(msg, 'Error saving.', 'error');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// --- DELETE ACCOUNT LOGIC ---
function setupDeleteLogic() {
  const initDeleteBtn = document.getElementById('initDeleteBtn');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteModal = document.getElementById('cancelDeleteModal');
  const deleteConfirmForm = document.getElementById('deleteConfirmForm');
  const passwordGroup = document.getElementById('passwordConfirmGroup');
  const googleMessage = document.getElementById('googleConfirmMessage');
  const passwordInput = document.getElementById('confirmPasswordInput');

  if (initDeleteBtn) {
    initDeleteBtn.addEventListener('click', () => {
      deleteModal.classList.add('active');
      // Check provider to toggle password field
      const providerId = currentUser.providerData[0]?.providerId;

      if (providerId === 'google.com') {
        if (passwordGroup) passwordGroup.style.display = 'none';
        if (googleMessage) googleMessage.style.display = 'block';
        if (passwordInput) passwordInput.removeAttribute('required');
      } else {
        if (passwordGroup) passwordGroup.style.display = 'block';
        if (googleMessage) googleMessage.style.display = 'none';
        if (passwordInput) {
          passwordInput.setAttribute('required', 'true');
          setTimeout(() => passwordInput.focus(), 100);
        }
      }
    });
  }

  if (cancelDeleteModal) {
    cancelDeleteModal.addEventListener('click', () => {
      deleteModal.classList.remove('active');
      deleteConfirmForm.reset();
    });
  }

  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        deleteModal.classList.remove('active');
        deleteConfirmForm.reset();
      }
    });
  }

  if (deleteConfirmForm) {
    deleteConfirmForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const confirmBtn = deleteConfirmForm.querySelector('.btn-confirm-delete');
      const originalText = confirmBtn.innerText;
      const providerId = currentUser.providerData[0]?.providerId;

      confirmBtn.disabled = true;
      confirmBtn.innerText = "Verifying...";

      try {
        const { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        if (providerId === 'google.com') {
          const provider = new GoogleAuthProvider();
          // Force account selection dialog
          provider.setCustomParameters({
            prompt: 'select_account'
          });
          await reauthenticateWithPopup(currentUser, provider);
        } else {
          const password = passwordInput.value;
          const credential = EmailAuthProvider.credential(currentUser.email, password);
          await reauthenticateWithCredential(currentUser, credential);
        }

        confirmBtn.innerText = "Deleting...";
        await deleteUser(currentUser);

        // Close modal first
        deleteModal.classList.remove('active');

        // Show success modal with redirect
        showSuccessModal(
          'Account Deleted 👋',
          'Your account has been permanently deleted. We\'re sorry to see you go!',
          () => {
            window.location.href = '../../index.html';
          }
        );

      } catch (error) {
        console.error('Error deleting account:', error);
        confirmBtn.disabled = false;
        confirmBtn.innerText = originalText;
        showSuccessModal(
          'Deletion Failed ❌',
          error.message || 'Unable to delete account. Please try again.',
          null,
          false
        );
      }
    });
  }
}