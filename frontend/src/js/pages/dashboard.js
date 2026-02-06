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

// Subject configurations for different exams
const EXAM_SUBJECTS = {
  JEE: [
    { name: 'Physics', icon: '⚛️', progress: 0, topics: 0, questions: 0 },
    { name: 'Chemistry', icon: '🧪', progress: 0, topics: 0, questions: 0 },
    { name: 'Mathematics', icon: '📐', progress: 0, topics: 0, questions: 0 }
  ],
  NEET: [
    { name: 'Physics', icon: '⚛️', progress: 0, topics: 0, questions: 0 },
    { name: 'Chemistry', icon: '🧪', progress: 0, topics: 0, questions: 0 },
    { name: 'Biology', icon: '🧬', progress: 0, topics: 0, questions: 0 }
  ]
};

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

      // Initialize dashboard with user data
      initializeDashboard(user, userData);
    } else {
      console.log("No user document found, redirecting to onboarding");
      window.location.href = '../pages/onboarding.html';
    }

  } catch (error) {
    console.error('Error loading user data:', error);
  }
});

// Initialize dashboard with personalized content
function initializeDashboard(user, userData) {
  // 1. Set User Name (Prioritize Database Name)
  const displayName = userData.fullName || user.displayName || 'Student';
  const firstName = displayName.split(' ')[0];

  const nameElement = document.getElementById('userName');
  if (nameElement) nameElement.textContent = firstName;

  // 2. Set User Avatar (FIXED: Checks Database Custom Photo First)
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    // Check for custom upload (photoBase64) OR Google photo (photoURL)
    const photoSource = userData.photoBase64 || user.photoURL;

    if (photoSource) {
      userAvatar.textContent = ''; // Clear initials
      userAvatar.style.backgroundImage = `url('${photoSource}')`;
      userAvatar.style.backgroundSize = 'cover';
      userAvatar.style.backgroundPosition = 'center';
    } else {
      // Fallback to Initials
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
  }

  // 3. Set Exam Information
  const targetExam = userData.targetExam || 'JEE';
  const targetYear = userData.targetYear || '2026';

  const examElement = document.getElementById('userExam');
  if (examElement) examElement.textContent = targetExam;

  const badgeText = document.getElementById('examBadgeText');
  if (badgeText) badgeText.textContent = `${targetExam} ${targetYear}`;

  // 4. Load Dynamic Content
  loadSubjects(targetExam);
  loadStudyStats();
  setupEventListeners();
}

// Load subjects based on exam type
function loadSubjects(examType) {
  const subjectsGrid = document.getElementById('subjectsGrid');
  if (!subjectsGrid) return;

  const subjects = EXAM_SUBJECTS[examType] || EXAM_SUBJECTS.JEE;

  subjectsGrid.innerHTML = '';

  subjects.forEach(subject => {
    const subjectCard = document.createElement('div');
    subjectCard.className = 'subject-card';
    subjectCard.innerHTML = `
            <div class="subject-icon">${subject.icon}</div>
            <h3 class="subject-title">${subject.name}</h3>
            <p class="subject-progress">${subject.progress}% Complete</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${subject.progress}%"></div>
            </div>
            <div class="subject-stats">
                <span>📚 ${subject.topics} Topics</span>
                <span>✅ ${subject.questions} Questions</span>
            </div>
        `;

    subjectCard.addEventListener('click', () => {
      showInfoModal(
        `${subject.name} Module 📚`,
        `We're working hard on building an amazing ${subject.name} learning experience. Stay tuned!`
      );
    });

    subjectsGrid.appendChild(subjectCard);
  });
}

// Load study statistics (placeholder data for now)
function loadStudyStats() {
  const ids = ['dailyStreak', 'hoursStudied', 'testsCompleted', 'avgScore'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = el.textContent || '0';
  });
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

  // Profile button (Dropdown Item)
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = '../pages/profile.html';
    });
  }

  // Avatar Click (Optional: Also go to profile)
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    userAvatar.addEventListener('click', () => {
      const dropdown = document.querySelector('.user-dropdown');
      // Toggle dropdown visibility if not using CSS hover, 
      // but usually this is handled by CSS :hover state on .user-profile
    });
  }

  // Quick action buttons
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actionCard = e.target.closest('.action-card');
      if (actionCard) {
        const actionTitle = actionCard.querySelector('.action-title').textContent;

        // Redirect to mock test page if "Start Mock Test" is clicked
        if (actionTitle === 'Start Mock Test') {
          window.location.href = '../pages/mocktest.html';
        } else {
          showInfoModal(
            'Coming Soon! 🚀',
            `The ${actionTitle} feature is under development. We'll notify you when it's ready!`
          );
        }
      }
    });
  });

  // Upcoming test register buttons
  const upcomingButtons = document.querySelectorAll('.upcoming-btn');
  upcomingButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.upcoming-item');
      if (item) {
        const testTitle = item.querySelector('.upcoming-title').textContent;
        showInfoModal(
          'Registration Opening Soon! 📝',
          `We're preparing the registration system for "${testTitle}". Keep an eye out for updates!`
        );
      }
    });
  });

  // Resource links
  const resourceLinks = document.querySelectorAll('.resource-link');
  resourceLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const card = e.target.closest('.resource-card');
      if (card) {
        const resourceTitle = card.querySelector('.resource-title').textContent;
        showInfoModal(
          'Resource Coming Soon! 📖',
          `We're curating quality ${resourceTitle} for you. Check back soon!`
        );
      }
    });
  });
}