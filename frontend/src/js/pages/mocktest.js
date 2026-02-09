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
import { showInterviewModal } from '../components/interviewModal.js';
import Config from '../config.js';

const db = getFirestore();
let currentUserData = null;

// --- IMMEDIATE UI UPDATE (Prevents Flash of Wrong Content) ---
// --- IMMEDIATE UI UPDATE (Prevents Flash of Wrong Content) ---
(function applyCachedExamPreference() {
  const cachedExam = localStorage.getItem('targetExam');
  if (cachedExam) {
    // Manually update text here to avoid dependency on function that might not be ready
    // or simply rely on the CSS/display toggling which is the most important visual part

    // Update Exam Title if element exists (might not exist yet if script runs in head, but usually at end of body)
    const examTitle = document.querySelector('.section-title');
    if (examTitle) {
      if (cachedExam === 'UPSC') {
        examTitle.textContent = 'UPSC Mock Tests 🎯';
      } else if (cachedExam === 'JEE') {
        examTitle.textContent = 'JEE Mock Tests 🎯';
      } else if (cachedExam === 'NEET') {
        examTitle.textContent = 'NEET Mock Tests 🎯';
      }
    }

    const upscSection = document.getElementById('upscTestsSection');
    const regularTestSection = document.querySelector('.test-selection-section');

    if (cachedExam === 'UPSC') {
      if (upscSection) upscSection.style.display = 'block';
      if (regularTestSection) regularTestSection.style.display = 'none';
      document.documentElement.setAttribute('data-exam', 'UPSC');
    } else {
      if (upscSection) upscSection.style.display = 'none';
      if (regularTestSection) regularTestSection.style.display = 'block';
      document.documentElement.setAttribute('data-exam', cachedExam);
    }
  }
})();

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

      // Cache the exam preference for next load
      if (userData.targetExam) {
        localStorage.setItem('targetExam', userData.targetExam);
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
  // Also update local storage to ensure it's fresh
  localStorage.setItem('targetExam', targetExam);

  updateSubjectText(targetExam);

  // Show/hide UPSC section based on exam type
  const upscSection = document.getElementById('upscTestsSection');
  const regularTestSection = document.querySelector('.test-selection-section');

  if (targetExam === 'UPSC') {
    if (upscSection) upscSection.style.display = 'block';
    if (regularTestSection) regularTestSection.style.display = 'none';
    document.documentElement.setAttribute('data-exam', 'UPSC');
  } else {
    if (upscSection) upscSection.style.display = 'none';
    if (regularTestSection) regularTestSection.style.display = 'block';
    document.documentElement.setAttribute('data-exam', targetExam);
  }

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

  // Test start buttons (Exclude UPSC cards as they have their own handler)
  const testButtons = document.querySelectorAll('.test-card:not(.upsc-test-card) .test-btn');
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
          } else if (currentUserData && (currentUserData.targetExam === 'JEE' || !currentUserData.targetExam)) {
            // Handle JEE (default if not specified)
            handleFullLengthJEETest();
          } else {
            // Other exams - show coming soon
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

  // Initialize UPSC Accordion
  initializeUPSCAccordion();

  // UPSC test card buttons (including Interview section)
  const upscTestButtons = document.querySelectorAll('.upsc-test-card .test-btn');
  upscTestButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const testCard = e.target.closest('.upsc-test-card');
      if (testCard) {
        const paper = testCard.getAttribute('data-paper');
        const testTitle = testCard.querySelector('.test-title').textContent;

        // Handle GS Prelims
        if (paper === 'gs-prelims') {
          handleGSPreTest();
          return;
        }

        // Handle CSAT
        if (paper === 'csat') {
          handleCSATTest();
          return;
        }

        // Handle Mock Interview - Show Interview Modal
        if (paper === 'interview-mock') {
          showInterviewModal();
          return;
        }

        let modalTitle = 'UPSC Test Coming Soon! 📚';
        let modalMessage = `The "${testTitle}" test interface is being developed with special features for UPSC preparation. We're making it comprehensive and student-friendly!`;

        // Customize message for DAF Analysis
        if (paper === 'daf-analysis') {
          modalTitle = 'Interview Prep Coming Soon! 🤝';
          modalMessage = `Our AI-powered "${testTitle}" feature is under construction. Get ready for real-time feedback and DAF analysis!`;
        }

        showInfoModal(modalTitle, modalMessage);
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

function initializeUPSCAccordion() {
  const headers = document.querySelectorAll('.upsc-accordion-item .accordion-header');

  headers.forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = header.nextElementSibling;
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      // Toggle current
      if (isExpanded) {
        header.setAttribute('aria-expanded', 'false');
        content.classList.remove('expanded');
      } else {
        header.setAttribute('aria-expanded', 'true');
        content.classList.add('expanded');
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

    const apiURL = Config.getAPIURL();
    const response = await fetch(`${apiURL}/ai/generate-questions`, {
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

// Handle Full Length JEE Mock Test
async function handleFullLengthJEETest() {
  try {
    // Show loading modal
    showLoadingModal(
      '🤖 Preparing Your Full Length JEE Test...',
      'Generating 75 JEE questions (20 MCQ + 5 Numerical per subject)...',
      8000
    );
    setLoadingStatus('AI is creating your personalized test...');

    // Prepare subject data for API
    const subjectData = {
      'Physics': {
        chapters: [],
        num_mcq: 20,
        num_numerical: 5,
        difficulty: 'Medium'
      },
      'Chemistry': {
        chapters: [],
        num_mcq: 20,
        num_numerical: 5,
        difficulty: 'Medium'
      },
      'Mathematics': {
        chapters: [],
        num_mcq: 20,
        num_numerical: 5,
        difficulty: 'Medium'
      }
    };

    // Generate questions
    setProgress(30);
    setLoadingStatus('Calling AI model...');

    const apiURL = Config.getAPIURL();
    const response = await fetch(`${apiURL}/ai/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: 'JEE',
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
      testId: `jee_full_${Date.now()}`,
      exam: 'JEE',
      subjects: ['Physics', 'Chemistry', 'Mathematics'],
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
    console.error('Full Length JEE test error:', error);
    hideLoadingModal();

    setTimeout(() => {
      showErrorModal(
        '❌ Test Start Failed',
        error.message || 'Failed to start test. Please try again.',
        () => {
          hideLoadingModal();
          handleFullLengthJEETest(); // Retry
        }
      );
    }, 300);
  }
}

// Handle UPSC GS Prelims Mock Test
async function handleGSPreTest() {
  console.log('[handleGSPreTest] Starting...');
  try {
    // Show loading modal
    showLoadingModal(
      '🤖 Preparing Your UPSC GS Prelims Test...',
      'Generating 100 high-quality Questions (History, Polity, Geography, Economy, etc.)...',
      12000
    );
    setLoadingStatus('AI is analyzing UPSC patterns...');

    // Prepare subject data for API - 100 questions total
    const subjectData = {
      'History': {
        chapters: [], // Full syllabus
        num_questions: 15,
        difficulty: 'Medium'
      },
      'Geography': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      },
      'Polity': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      },
      'Economy': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      },
      'General Science': {
        chapters: [],
        num_questions: 10,
        difficulty: 'Medium'
      },
      'Environment': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      },
      'Current Affairs': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      }
    };

    // Generate questions
    setProgress(30);
    setLoadingStatus('Referring to standard books and resources...');

    const apiURL = Config.getAPIURL();
    console.log('[handleGSPreTest] Sending API request...', { exam: 'UPSC', subjectData });
    const response = await fetch(`${apiURL}/ai/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: 'UPSC',
        subject_data: subjectData
      })
    });

    console.log('[handleGSPreTest] Response received:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[handleGSPreTest] API Error:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to generate questions');
    }

    const data = await response.json();
    console.log('[handleGSPreTest] Data received:', data);

    if (!data.success) {
      throw new Error(data.error || 'Question generation failed');
    }

    // Prepare test data
    setProgress(80);
    updateLoadingModal(
      '⏱️ Starting Test...',
      'Your paper is ready! Redirecting to examination hall...'
    );

    // Store test data in sessionStorage
    const testData = {
      testId: `upsc_gs_${Date.now()}`,
      exam: 'UPSC',
      subjects: ['History', 'Geography', 'Polity', 'Economy', 'General Science', 'Environment', 'Current Affairs'],
      questions: data.questions,
      by_subject: data.by_subject,
      duration: 120, // 2 hours in minutes
      startTime: null, // Will be set when test page loads
      metadata: data.metadata
    };

    sessionStorage.setItem('currentTest', JSON.stringify(testData));

    setProgress(100);

    // Show success and redirect
    hideLoadingModal();

    setTimeout(() => {
      showSuccessModal(
        '✅ Paper Ready!',
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
    console.error('UPSC GS Pre test error:', error);
    // Don't hide, just transition to error state
    showErrorModal(
      '❌ Test Start Failed',
      error.message || 'Failed to start test. Please try again.',
      () => {
        hideLoadingModal();
        handleGSPreTest(); // Retry
      }
    );
  }
}

// Handle UPSC CSAT Mock Test
async function handleCSATTest() {
  console.log('[handleCSATTest] Starting...');
  try {
    // Show loading modal
    showLoadingModal(
      '🧠 Preparing Your CSAT (Paper II) Test...',
      'Generating 80 Questions (Reading Comprehension, Reasoning, Quant)...',
      12000
    );
    setLoadingStatus('AI is crafting logical puzzles and passages...');

    // Prepare subject data for API - 80 questions total
    const subjectData = {
      'Reading Comprehension': {
        chapters: [],
        num_questions: 27,
        difficulty: 'Medium'
      },
      'Quantitative Aptitude': {
        chapters: [],
        num_questions: 28,
        difficulty: 'Medium'
      },
      'Logical Reasoning': {
        chapters: [],
        num_questions: 15,
        difficulty: 'Medium'
      },
      'Data Interpretation': {
        chapters: [],
        num_questions: 10,
        difficulty: 'Medium'
      }
    };

    // Generate questions
    setProgress(30);
    setLoadingStatus('Analyzing previous year trends...');

    const apiURL = Config.getAPIURL();
    console.log('[handleCSATTest] Sending API request...', { exam: 'CSAT', subjectData });
    const response = await fetch(`${apiURL}/ai/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exam: 'CSAT',
        subject_data: subjectData
      })
    });

    console.log('[handleCSATTest] Response received:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[handleCSATTest] API Error:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to generate questions');
    }

    const data = await response.json();
    console.log('[handleCSATTest] Data received:', data);

    if (!data.success) {
      throw new Error(data.error || 'Question generation failed');
    }

    // Prepare test data
    setProgress(80);
    updateLoadingModal(
      '⏱️ Starting Test...',
      'Your CSAT paper is ready! Redirecting to examination hall...'
    );

    // Store test data in sessionStorage
    const testData = {
      testId: `upsc_csat_${Date.now()}`,
      exam: 'CSAT',
      subjects: ['Reading Comprehension', 'Quantitative Aptitude', 'Logical Reasoning', 'Data Interpretation'],
      questions: data.questions,
      by_subject: data.by_subject,
      duration: 120, // 2 hours in minutes
      startTime: null, // Will be set when test page loads
      metadata: data.metadata
    };

    sessionStorage.setItem('currentTest', JSON.stringify(testData));

    setProgress(100);

    // Show success and redirect
    hideLoadingModal();

    setTimeout(() => {
      showSuccessModal(
        '✅ CSAT Ready!',
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
    console.error('CSAT test error:', error);
    // Don't hide, just transition to error state
    showErrorModal(
      '❌ Test Start Failed',
      error.message || 'Failed to start test. Please try again.',
      () => {
        hideLoadingModal();
        handleCSATTest(); // Retry
      }
    );
  }
}
