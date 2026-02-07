import { auth } from '../config/firebase-config.js';
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showInfoModal } from '../utils/info-modal.js';

const db = getFirestore();

// Check authentication and load user data
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../pages/login.html';
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Check if onboarding is completed
      if (!userData.onboardingCompleted) {
        window.location.href = '../pages/onboarding.html';
        return;
      }

      // Initialize page with user data
      initializeMockTestPage(user, userData);
    } else {
      console.log("No user document found, redirecting to onboarding");
      window.location.href = '../pages/onboarding.html';
    }

  } catch (error) {
    console.error('Error loading user data:', error);
  }
});

// Initialize mock test page with personalized content
function initializeMockTestPage(user, userData) {
  // Set User Avatar
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    const photoSource = userData.photoBase64 || user.photoURL;
    const displayName = userData.fullName || user.displayName || 'Student';
    const firstName = displayName.split(' ')[0];

    if (photoSource) {
      userAvatar.textContent = '';
      userAvatar.style.backgroundImage = `url('${photoSource}')`;
      userAvatar.style.backgroundSize = 'cover';
      userAvatar.style.backgroundPosition = 'center';
    } else {
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
  }

  // Update subject text based on exam type
  const targetExam = userData.targetExam || 'JEE';
  updateSubjectText(targetExam);

  // Setup event listeners
  setupEventListeners();
}

// Update subject text based on exam type
function updateSubjectText(examType) {
  // Define subjects for each exam
  const subjects = {
    JEE: 'Physics, Chemistry, Math',
    NEET: 'Physics, Chemistry, Biology'
  };

  const subjectText = subjects[examType] || subjects.JEE;

  // Update Full Length Test subjects
  const fullTestSubjects = document.getElementById('fullTestSubjects');
  if (fullTestSubjects) {
    fullTestSubjects.textContent = subjectText;
  }

  // Update PYQ Test subjects
  const pyqTestSubjects = document.getElementById('pyqTestSubjects');
  if (pyqTestSubjects) {
    pyqTestSubjects.textContent = subjectText;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.href = '../../index.html';
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
      }
    });
  }

  // Profile button
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = '../pages/profile.html';
    });
  }

  // Dashboard button
  const dashboardBtn = document.getElementById('dashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      window.location.href = '../pages/dashboard.html';
    });
  }

  // Test start buttons
  const testButtons = document.querySelectorAll('.test-btn');
  testButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const testCard = e.target.closest('.test-card');
      if (testCard) {
        const testTitle = testCard.querySelector('.test-title').textContent;

        // Navigate to custom test page for "Custom Mock Test"
        if (testTitle === 'Custom Mock Test') {
          window.location.href = '../pages/custom-test.html';
        } else {
          showInfoModal(
            'Test Starting Soon! 🎯',
            `The "${testTitle}" test interface is being developed. We're making it amazing for you!`
          );
        }
      }
    });
  });

  // Review buttons
  const reviewButtons = document.querySelectorAll('.review-btn');
  reviewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const testItem = e.target.closest('.recent-test-item');
      if (testItem) {
        const testTitle = testItem.querySelector('.recent-test-title').textContent;
        showInfoModal(
          'Review Feature Coming! 📊',
          `Detailed review and analytics for "${testTitle}" will be available soon!`
        );
      }
    });
  });
}
