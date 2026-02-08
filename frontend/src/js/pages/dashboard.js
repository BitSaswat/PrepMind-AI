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

// --- 1. CONFIGURATION & HELPER FUNCTIONS (Moved to top for immediate access) ---

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
  ],
  UPSC: [
    // Prelims Papers (2)
    { name: 'GS Prelims', icon: '📋', progress: 0, topics: 0, questions: 0 },
    { name: 'CSAT', icon: '🧮', progress: 0, topics: 0, questions: 0 },
    // Mains Papers (7)
    { name: 'GS-1 (Mains)', icon: '🏛️', progress: 0, topics: 0, questions: 0 },
    { name: 'GS-2 (Mains)', icon: '⚖️', progress: 0, topics: 0, questions: 0 },
    { name: 'GS-3 (Mains)', icon: '🌍', progress: 0, topics: 0, questions: 0 },
    { name: 'GS-4 (Mains)', icon: '💡', progress: 0, topics: 0, questions: 0 },
    { name: 'Essay', icon: '✍️', progress: 0, topics: 0, questions: 0 },
    { name: 'Optional Paper 1', icon: '📚', progress: 0, topics: 0, questions: 0 },
    { name: 'Optional Paper 2', icon: '📖', progress: 0, topics: 0, questions: 0 }
  ]
};

// Create collapsible category for UPSC subjects
function createCollapsibleCategory(title, icon, subjects, isExpanded = false) {
  const category = document.createElement('div');
  category.className = 'subject-category';

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div class="category-header-content">
      <span class="category-icon">${icon}</span>
      <h3 class="category-title">${title}</h3>
      <span class="category-count">${subjects.length} Papers</span>
    </div>
    <span class="category-toggle">${isExpanded ? '▼' : '▶'}</span>
  `;

  const content = document.createElement('div');
  content.className = `category-content ${isExpanded ? 'expanded' : ''}`;

  const grid = document.createElement('div');
  grid.className = 'category-subjects-grid';

  subjects.forEach(subject => {
    const subjectCard = createSubjectCard(subject);
    grid.appendChild(subjectCard);
  });

  content.appendChild(grid);
  category.appendChild(header);
  category.appendChild(content);

  // Toggle functionality - scoped to this specific category
  header.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    const toggle = header.querySelector('.category-toggle');

    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      toggle.textContent = '▶';
      header.setAttribute('aria-expanded', 'false');
    } else {
      content.classList.add('expanded');
      toggle.textContent = '▼';
      header.setAttribute('aria-expanded', 'true');
    }
  });

  // Set initial aria-expanded attribute
  header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');

  return category;
}

// Create individual subject card
function createSubjectCard(subject) {
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
      <span>${subject.topics} Topics</span>
      <span>${subject.questions} Qs</span>
    </div>
  `;
  return subjectCard;
}

// Load subjects dynamically based on exam type
function loadSubjects(examType) {
  const subjectsGrid = document.getElementById('subjectsGrid');
  if (!subjectsGrid) return;

  const subjects = EXAM_SUBJECTS[examType] || EXAM_SUBJECTS.JEE;

  subjectsGrid.innerHTML = '';

  // For UPSC, create collapsible categories
  if (examType === 'UPSC') {
    // Prelims Category
    const prelimsCategory = createCollapsibleCategory(
      'Prelims',
      '📋',
      subjects.slice(0, 2), // GS Prelims, CSAT
      false // collapsed by default
    );
    subjectsGrid.appendChild(prelimsCategory);

    // Mains Category
    const mainsCategory = createCollapsibleCategory(
      'Mains',
      '✍️',
      subjects.slice(2), // GS-1 through Optional Paper 2
      false // collapsed by default
    );
    subjectsGrid.appendChild(mainsCategory);
  } else {
    // For JEE/NEET, show subjects normally
    subjects.forEach(subject => {
      const subjectCard = createSubjectCard(subject);
      subjectsGrid.appendChild(subjectCard);
    });
  }
}

// Load upcoming tests
function loadUpcomingTests(examType) {
  const upcomingList = document.querySelector('.upcoming-list');
  if (!upcomingList) return;

  const tests = examType === 'UPSC' ? [
    { icon: '📋', title: 'Prelims Mock Test #1', date: 'Tomorrow, 10:00 AM' },
    { icon: '✍️', title: 'Mains Answer Writing', date: 'Feb 10, 2026' },
    { icon: '🎤', title: 'Interview Preparation', date: 'Feb 15, 2026' }
  ] : [
    { icon: '📝', title: 'Full Mock Test #1', date: 'Tomorrow, 10:00 AM' },
    { icon: '🧪', title: examType === 'NEET' ? 'Biology Practice Test' : 'Chemistry Practice Test', date: 'Feb 6, 2026' },
    { icon: '🔬', title: 'Physics Mock Test', date: 'Feb 8, 2026' }
  ];

  upcomingList.innerHTML = '';

  tests.forEach(test => {
    const upcomingItem = document.createElement('div');
    upcomingItem.className = 'upcoming-item';
    upcomingItem.innerHTML = `
      <div class="upcoming-icon">${test.icon}</div>
      <div class="upcoming-content">
        <h4 class="upcoming-title">${test.title}</h4>
        <p class="upcoming-date">${test.date}</p>
      </div>
      <button class="upcoming-btn">Register</button>
    `;
    upcomingList.appendChild(upcomingItem);
  });
}

// Load study resources based on exam type
function loadStudyResources(examType) {
  const resourcesGrid = document.querySelector('.resources-grid');
  if (!resourcesGrid) return;

  const resources = examType === 'UPSC' ? [
    { icon: '📰', title: 'Current Affairs', description: 'Daily news digest and analysis' },
    { icon: '📖', title: 'NCERT Notes', description: 'Comprehensive NCERT summaries' },
    { icon: '📋', title: 'Previous Year Papers', description: 'Prelims and Mains questions' },
    { icon: '🎤', title: 'Interview Tips', description: 'Personality test preparation' }
  ] : [
    { icon: '💡', title: 'Study Tips', description: 'Effective strategies for exam preparation' },
    { icon: '📖', title: 'Formula Sheets', description: 'Quick reference for important formulas' },
    { icon: '🎥', title: 'Video Lectures', description: 'Concept explanations by experts' },
    { icon: '📋', title: 'Previous Papers', description: 'Past year question papers' }
  ];

  resourcesGrid.innerHTML = '';

  resources.forEach(resource => {
    const resourceCard = document.createElement('div');
    resourceCard.className = 'resource-card';
    resourceCard.innerHTML = `
      <div class="resource-icon">${resource.icon}</div>
      <h3 class="resource-title">${resource.title}</h3>
      <p class="resource-description">${resource.description}</p>
      <a href="#" class="resource-link">Read More →</a>
    `;
    resourcesGrid.appendChild(resourceCard);
  });
}



// --- 2. IMMEDIATE UI UPDATE (Executed immediately) ---
(function applyCachedExamPreference() {
  const cachedExam = localStorage.getItem('targetExam');
  const cachedYear = localStorage.getItem('targetYear');

  if (cachedExam) {
    // Update Badge
    const badgeText = document.getElementById('examBadgeText');
    if (badgeText) badgeText.textContent = `${cachedExam} ${cachedYear || '2026'}`;

    // Update Exam Text
    const examElement = document.getElementById('userExam');
    if (examElement) examElement.textContent = cachedExam;

    // RENDER CONTENT IMMEDIATELY
    loadSubjects(cachedExam);
    loadUpcomingTests(cachedExam);
    loadStudyResources(cachedExam);
  }
})();


// --- 3. AUTHENTICATION & INITIALIZATION ---

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

      // Cache preference
      if (userData.targetExam) {
        localStorage.setItem('targetExam', userData.targetExam);
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
  // Store user data
  const targetExam = userData.targetExam || 'JEE';
  localStorage.setItem('targetExam', targetExam); // Keep fresh

  const targetYear = userData.targetYear || '2026';
  localStorage.setItem('targetYear', targetYear);

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

  // 3. Set Exam Information (UPDATED: Uses cached or passed data)
  const examElement = document.getElementById('userExam');
  if (examElement) examElement.textContent = targetExam;

  const badgeText = document.getElementById('examBadgeText');
  if (badgeText) badgeText.textContent = `${targetExam} ${targetYear}`;

  // 4. Load Dynamic Content
  loadSubjects(targetExam);
  loadStudyStats();
  setupEventListeners(targetExam);
  loadQuickActions(targetExam);
  loadUpcomingTests(targetExam);
  loadStudyResources(targetExam);
}

// 5. OTHER FUNCTIONS (Study Stats, etc.)

// Load study statistics from Firestore
async function loadStudyStats() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const statsDoc = await getDoc(doc(db, 'users', user.uid, 'stats', 'summary'));

    if (statsDoc.exists()) {
      const stats = statsDoc.data();

      // Update streak
      const currentStreak = stats.currentStreak || 0;
      const longestStreak = stats.longestStreak || 0;
      document.getElementById('dailyStreak').textContent = currentStreak;
      document.getElementById('longestStreak').textContent = `Longest: ${longestStreak}`;

      // Update hours studied (total from all tests)
      const totalHours = stats.totalHoursStudied || 0;
      const bestHours = stats.bestDailyHours || 0;
      document.getElementById('hoursStudied').textContent = `${totalHours.toFixed(1)}h`;
      document.getElementById('bestHours').textContent = `Best: ${bestHours.toFixed(1)}h`;

      // Update tests completed (total)
      const totalTests = stats.totalTestsCompleted || 0;
      const bestTests = stats.bestDailyTests || 0;
      document.getElementById('testsCompleted').textContent = totalTests;
      document.getElementById('bestTests').textContent = `Best: ${bestTests}/day`;
    } else {
      // Initialize with zeros if no stats exist
      document.getElementById('dailyStreak').textContent = '0';
      document.getElementById('longestStreak').textContent = 'Longest: 0';
      document.getElementById('hoursStudied').textContent = '0h';
      document.getElementById('bestHours').textContent = 'Best: 0h';
      document.getElementById('testsCompleted').textContent = '0';
      document.getElementById('bestTests').textContent = 'Best: 0/day';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    // Show zeros on error
    document.getElementById('dailyStreak').textContent = '0';
    document.getElementById('longestStreak').textContent = 'Longest: 0';
    document.getElementById('hoursStudied').textContent = '0h';
    document.getElementById('bestHours').textContent = 'Best: 0h';
    document.getElementById('testsCompleted').textContent = '0';
    document.getElementById('bestTests').textContent = 'Best: 0/day';
  }
}

// Setup event listeners
function setupEventListeners(examType) {
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

  // Quick action buttons (using event delegation for dynamically created elements)
  document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('.action-btn');
    if (actionBtn) {
      const actionCard = actionBtn.closest('.action-card');
      if (actionCard) {
        const actionTitle = actionCard.querySelector('.action-title').textContent;

        // Redirect to mock test page if "Start Mock Test" or "Mock Test" is clicked
        if (actionTitle === 'Start Mock Test' || actionTitle === 'Mock Test') {
          window.location.href = '../pages/mocktest.html';
        } else if (actionTitle === 'Current Affairs' || actionTitle === 'Previous Papers') {
          // UPSC-specific actions
          showInfoModal(
            'Coming Soon! 🚀',
            `The ${actionTitle} feature is under development. We'll notify you when it's ready!`
          );
        } else {
          showInfoModal(
            'Coming Soon! 🚀',
            `The ${actionTitle} feature is under development. We'll notify you when it's ready!`
          );
        }
      }
    }
  });

  // Upcoming test register buttons (using event delegation)
  document.addEventListener('click', (e) => {
    const upcomingBtn = e.target.closest('.upcoming-btn');
    if (upcomingBtn) {
      const item = upcomingBtn.closest('.upcoming-item');
      if (item) {
        const testTitle = item.querySelector('.upcoming-title').textContent;
        showInfoModal(
          'Registration Opening Soon! 📝',
          `We're preparing the registration system for "${testTitle}". Keep an eye out for updates!`
        );
      }
    }
  });

  // Resource links (using event delegation)
  document.addEventListener('click', (e) => {
    const resourceLink = e.target.closest('.resource-link');
    if (resourceLink) {
      e.preventDefault();
      const card = resourceLink.closest('.resource-card');
      if (card) {
        const resourceTitle = card.querySelector('.resource-title').textContent;
        showInfoModal(
          'Resource Coming Soon! 📖',
          `We're curating quality ${resourceTitle} for you. Check back soon!`
        );
      }
    }
  });
}

// Load quick actions based on exam type
function loadQuickActions(examType) {
  const quickActionsGrid = document.querySelector('.quick-actions-grid');
  if (!quickActionsGrid) return;

  const actions = examType === 'UPSC' ? [
    { icon: '📰', title: 'Current Affairs', description: 'Daily news and analysis', primary: true },
    { icon: '🎯', title: 'Mock Test', description: 'Take UPSC practice tests', primary: false },
    { icon: '📄', title: 'Previous Papers', description: 'Solve past year questions', primary: false },
    { icon: '📚', title: 'Study Materials', description: 'Access notes and resources', primary: false }
  ] : [
    { icon: '🎯', title: 'Start Mock Test', description: 'Take a full-length practice test', primary: true },
    { icon: '💡', title: 'Practice Questions', description: 'Solve topic-wise questions', primary: false },
    { icon: '📚', title: 'Study Materials', description: 'Access notes and resources', primary: false },
    { icon: '📈', title: 'Performance Analytics', description: 'View detailed insights', primary: false }
  ];

  quickActionsGrid.innerHTML = '';

  actions.forEach(action => {
    const actionCard = document.createElement('div');
    actionCard.className = action.primary ? 'action-card action-primary' : 'action-card';
    actionCard.innerHTML = `
      <div class="action-icon">${action.icon}</div>
      <h3 class="action-title">${action.title}</h3>
      <p class="action-description">${action.description}</p>
      <button class="action-btn">${action.primary ? 'Start Now' : (action.title.includes('Mock') ? 'Start Now' : (action.title.includes('Practice') || action.title.includes('Writing') ? 'Practice' : (action.title.includes('View') || action.title.includes('Analytics') ? 'View Stats' : 'Browse')))}</button>
    `;
    quickActionsGrid.appendChild(actionCard);
  });
}