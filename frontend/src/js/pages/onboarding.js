import { auth } from '../config/firebase-config.js';
// 1. ADDED: Import onAuthStateChanged
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showSuccessModal } from '../utils/success-modal.js';

const db = getFirestore();

// DOM Elements
const onboardingForm = document.getElementById('onboardingForm');
const onboardingMessage = document.getElementById('onboardingMessage');

// Helper to show messages
const showMessage = (element, message, type) => {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
};

// 2. FIXED: Changed auth.onAuthStateChanged(...) to onAuthStateChanged(auth, ...)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // If not logged in, redirect to login
    console.log("No user found, redirecting to login");
    window.location.href = '../pages/login.html';
  } else {
    console.log("User authenticated:", user.email);
  }
});

// Handle Onboarding Form Submission
if (onboardingForm) {
  onboardingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button to prevent double clicks
    const submitBtn = onboardingForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const user = auth.currentUser;

    if (!user) {
      showMessage(onboardingMessage, 'Please log in first', 'error');
      setTimeout(() => {
        window.location.href = '../pages/login.html';
      }, 2000);
      return;
    }

    // Get user's display name from auth
    const displayName = user.displayName || user.email?.split('@')[0] || 'Student';

    const formData = {
      fullName: displayName,
      targetExam: document.getElementById('targetExam').value,
      educationLevel: document.getElementById('educationLevel').value,
      targetYear: document.getElementById('targetYear').value,
      studyHours: document.getElementById('studyHours').value,
      preferredLanguage: 'English', // Default value since field was removed
      onboardingCompleted: true,
      createdAt: new Date().toISOString()
    };

    try {
      // Save to Firestore
      await setDoc(doc(db, 'users', user.uid), formData, { merge: true });

      // Show success modal with redirect
      showSuccessModal(
        'Profile Created! 🎉',
        'Welcome to PrepMind AI! Let\'s start your learning journey.',
        () => {
          window.location.href = '../pages/dashboard.html';
        }
      );

    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage(onboardingMessage, 'Error saving your profile: ' + error.message, 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}   