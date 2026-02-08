import { auth } from '../config/firebase-config.js';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showInfoModal } from '../utils/info-modal.js';
import {
  showLoadingModal,
  updateLoadingModal,
  hideLoadingModal,
  showSuccessModal,
  showErrorModal,
  setProgress,
  setLoadingStatus
} from '../utils/loading-modal.js';

const db = getFirestore();
let currentUserData = null;

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
  // Store user data for later use
  currentUserData = userData;

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

  // Load test history
  loadTestHistory(user.uid);

  // Setup event listeners
  setupEventListeners();
}

// Update subject text based on exam type
// Update subject text and exam details based on exam type
function updateSubjectText(examType) {
  // Define details for each exam
  const examDetails = {
    JEE: {
      subjects: 'Physics, Chemistry, Math',
      duration: '3 Hours',
      questions: '75 Questions'
    },
    NEET: {
      subjects: 'Physics, Chemistry, Botany, Zoology',
      duration: '3 Hours',
      questions: '180 Questions'
    }
  };

  const details = examDetails[examType] || examDetails.JEE;

  // Update Full Length Test
  const fullTestSubjects = document.getElementById('fullTestSubjects');
  if (fullTestSubjects) fullTestSubjects.textContent = details.subjects;

  const fullTestDuration = document.getElementById('fullTestDuration');
  if (fullTestDuration) fullTestDuration.textContent = details.duration;

  const fullTestQuestions = document.getElementById('fullTestQuestions');
  if (fullTestQuestions) fullTestQuestions.textContent = details.questions;

  // Update PYQ Test
  const pyqTestSubjects = document.getElementById('pyqTestSubjects');
  if (pyqTestSubjects) pyqTestSubjects.textContent = details.subjects;

  const pyqTestDuration = document.getElementById('pyqTestDuration');
  if (pyqTestDuration) pyqTestDuration.textContent = details.duration;

  const pyqTestQuestions = document.getElementById('pyqTestQuestions');
  if (pyqTestQuestions) pyqTestQuestions.textContent = details.questions;
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

        // Handle Full Length Mock Test
        if (testTitle === 'Full Length Mock Test') {
          // Check if user is NEET student
          if (currentUserData && currentUserData.targetExam === 'NEET') {
            handleFullLengthNEETTest();
          } else {
            // JEE or other - show coming soon
            showInfoModal(
              'Test Starting Soon! 🎯',
              `The "${testTitle}" test interface is being developed. We're making it amazing for you!`
            );
          }
        }
        // Navigate to custom test page for "Custom Mock Test"
        else if (testTitle === 'Custom Mock Test') {
          window.location.href = '../pages/custom-test.html';
        }
        // Other tests - show coming soon
        else {
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
        // In future, redirect to analysis page with testId
        showInfoModal(
          'Review Feature Coming! 📊',
          `Detailed review and analytics for "${testTitle}" will be available soon!`
        );
      }
    });
  });
}

// Load recent test history from Firestore
async function loadTestHistory(userId) {
  const historyContainer = document.querySelector('.recent-tests-list');
  if (!historyContainer) return;

  try {
    const historyRef = collection(db, 'users', userId, 'testHistory');
    const q = query(historyRef, orderBy('createdAt', 'desc'), limit(4));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      historyContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding: 20px;">No test history found. Start your first mock test!</p>';
      return;
    }

    historyContainer.innerHTML = ''; // Clear dummy data

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = new Date(data.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const testItem = document.createElement('div');
      testItem.className = 'recent-test-item';
      testItem.innerHTML = `
        <div class="recent-test-icon">✅</div>
        <div class="recent-test-content">
            <h4 class="recent-test-title">${data.testTitle || 'Mock Test'}</h4>
            <p class="recent-test-date">Completed on ${date}</p>
        </div>
        <div class="recent-test-score">
            <span class="score-value">${data.percentage}%</span>
            <span class="score-label">Score</span>
        </div>
        <button class="review-btn" onclick="window.location.href='test-analysis.html?id=${doc.id}'">Review</button>
      `;
      historyContainer.appendChild(testItem);
    });

  } catch (error) {
    console.error('Error loading test history:', error);
    historyContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Unable to load history at the moment.</p>';
  }
}

// Handle Full Length NEET Mock Test
async function handleFullLengthNEETTest() {
  try {
    // Show loading modal
    showLoadingModal(
      '🤖 Preparing Your Full Length Test...',
      'Generating 180 NEET questions for your 3-hour test',
      8000
    );
    setLoadingStatus('AI is creating your personalized test...');

    // Prepare subject data for API - 45 questions per subject
    const subjectData = {
      'Physics': {
        chapters: [], // Will use all chapters from syllabus
        num_questions: 45,
        difficulty: 'Medium'
      },
      'Chemistry': {
        chapters: [], // Will use all chapters from syllabus
        num_questions: 45,
        difficulty: 'Medium'
      },
      'Botany': {
        chapters: [], // Will use all chapters from syllabus
        num_questions: 45,
        difficulty: 'Medium'
      },
      'Zoology': {
        chapters: [], // Will use all chapters from syllabus
        num_questions: 45,
        difficulty: 'Medium'
      }
    };

    // Generate questions
    setProgress(30);
    setLoadingStatus('Calling AI model...');

    const response = await fetch('http://localhost:5000/api/ai/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: 'NEET',
        subject_data: subjectData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate questions');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Question generation failed');
    }

    // Prepare test data
    setProgress(80);
    updateLoadingModal(
      '⏱️ Starting Test...',
      'Your test is ready! Redirecting to test interface...'
    );

    // Store test data in sessionStorage
    const testData = {
      testId: `neet_full_${Date.now()}`,
      exam: 'NEET',
      subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
      questions: data.questions,
      by_subject: data.by_subject,
      duration: 180, // 3 hours in minutes
      startTime: null, // Will be set when test page loads
      metadata: data.metadata
    };

    sessionStorage.setItem('currentTest', JSON.stringify(testData));

    setProgress(100);

    // Show success and redirect
    hideLoadingModal();

    setTimeout(() => {
      showSuccessModal(
        '✅ Test Ready!',
        'Redirecting to test interface...',
        1500
      );

      setTimeout(() => {
        hideLoadingModal();
        // Redirect to the Live Test page
        window.location.href = '../pages/live-test.html';
      }, 1500);
    }, 300);

  } catch (error) {
    console.error('Full Length NEET test error:', error);
    hideLoadingModal();

    setTimeout(() => {
      showErrorModal(
        '❌ Test Start Failed',
        error.message || 'Failed to start test. Please try again.',
        () => {
          hideLoadingModal();
          handleFullLengthNEETTest(); // Retry
        }
      );
    }, 300);
  }
}
