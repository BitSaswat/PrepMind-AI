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

// Subject configurations for different exams
const EXAM_SUBJECTS = {
    JEE: [
        { name: 'Physics', icon: '⚛️' },
        { name: 'Chemistry', icon: '🧪' },
        { name: 'Mathematics', icon: '📐' }
    ],
    NEET: [
        { name: 'Physics', icon: '⚛️' },
        { name: 'Chemistry', icon: '🧪' },
        { name: 'Botany', icon: '🌿' },
        { name: 'Zoology', icon: '🦁' }
    ]
};

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

            currentUserData = userData;
            // Initialize page with user data
            initializeCustomTestPage(user, userData);
        } else {
            console.log("No user document found, redirecting to onboarding");
            window.location.href = '../pages/onboarding.html';
        }

    } catch (error) {
        console.error('Error loading user data:', error);
    }
});

// Initialize custom test page
function initializeCustomTestPage(user, userData) {
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

    // Get exam type and render subjects
    const examType = userData.targetExam || 'JEE';
    renderSubjectSelection(examType);

    // Setup event listeners
    setupEventListeners();

    // Explicitly reset radio buttons to prevent browser form state persistence
    document.getElementById('liveModeRadio').checked = false;
    document.getElementById('pdfModeRadio').checked = false;
}

// Render subject selection checkboxes
function renderSubjectSelection(examType) {
    const container = document.getElementById('subjectSelection');
    const subjects = EXAM_SUBJECTS[examType] || EXAM_SUBJECTS.JEE;

    container.innerHTML = '';

    subjects.forEach(subject => {
        const subjectCard = document.createElement('label');
        subjectCard.className = 'subject-checkbox-card';
        subjectCard.innerHTML = `
      <input type="checkbox" name="subject" value="${subject.name}" class="subject-checkbox">
      <div class="subject-checkbox-content">
        <span class="subject-checkbox-icon">${subject.icon}</span>
        <span class="subject-checkbox-name">${subject.name}</span>
      </div>
    `;
        container.appendChild(subjectCard);
    });

    // Add event listeners to checkboxes
    const checkboxes = container.querySelectorAll('.subject-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', onSubjectSelectionChange);
    });
}

// Handle subject selection changes
function onSubjectSelectionChange() {
    const selectedSubjects = getSelectedSubjects();

    if (selectedSubjects.length > 0) {
        document.getElementById('questionCountMerged').style.display = 'block';
        document.getElementById('testModeSection').style.display = 'block';
        document.getElementById('formActions').style.display = 'flex';
    } else {
        document.getElementById('questionCountMerged').style.display = 'none';
        document.getElementById('testModeSection').style.display = 'none';
        document.getElementById('formActions').style.display = 'none';
    }
}

// Get selected subjects
function getSelectedSubjects() {
    const checkboxes = document.querySelectorAll('.subject-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}



// Setup event listeners
function setupEventListeners() {
    // Navigation buttons
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = '../../index.html';
    });

    document.getElementById('profileBtn')?.addEventListener('click', () => {
        window.location.href = '../pages/profile.html';
    });

    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        window.location.href = '../pages/dashboard.html';
    });

    document.getElementById('mockTestBtn')?.addEventListener('click', () => {
        window.location.href = '../pages/mocktest.html';
    });

    document.getElementById('backBtn')?.addEventListener('click', () => {
        window.location.href = '../pages/mocktest.html';
    });

    // Test mode radio buttons
    const pdfModeRadio = document.getElementById('pdfModeRadio');
    const liveModeRadio = document.getElementById('liveModeRadio');

    pdfModeRadio?.addEventListener('change', () => {
        if (pdfModeRadio.checked) {
            document.getElementById('pdfOptions').style.display = 'block';
            document.getElementById('liveOptions').style.display = 'none';
        }
    });

    liveModeRadio?.addEventListener('change', () => {
        if (liveModeRadio.checked) {
            document.getElementById('liveOptions').style.display = 'block';
            document.getElementById('pdfOptions').style.display = 'none';
        }
    });

    // Form submission
    const form = document.getElementById('customTestForm');
    form?.addEventListener('submit', handleFormSubmit);

    // Question count validation - ensure multiples of 5 and non-zero
    const questionInput = document.getElementById('questionsPerSubject');
    if (questionInput) {
        questionInput.addEventListener('blur', (e) => {
            let value = parseInt(e.target.value);

            // If empty or zero, set to minimum (5)
            if (!value || value <= 0) {
                e.target.value = 5;
                return;
            }

            // If not a multiple of 5, round to nearest multiple of 5
            if (value % 5 !== 0) {
                const remainder = value % 5;
                if (remainder < 3) {
                    // Round down
                    value = value - remainder;
                } else {
                    // Round up
                    value = value + (5 - remainder);
                }

                // Ensure it's at least 5
                value = Math.max(5, value);
                // Ensure it's at most 100
                value = Math.min(100, value);

                e.target.value = value;
            }
        });
    }

    // Test duration validation - ensure multiples of 5 and minimum 5 minutes
    const durationInput = document.getElementById('testDuration');
    if (durationInput) {
        durationInput.addEventListener('blur', (e) => {
            let value = parseInt(e.target.value);

            // If empty or less than 5, set to minimum (5)
            if (!value || value < 5) {
                e.target.value = 5;
                return;
            }

            // If not a multiple of 5, round to nearest multiple of 5
            if (value % 5 !== 0) {
                const remainder = value % 5;
                if (remainder < 3) {
                    // Round down
                    value = value - remainder;
                } else {
                    // Round up
                    value = value + (5 - remainder);
                }

                // Ensure it's at least 5
                value = Math.max(5, value);
                // Ensure it's at most 180
                value = Math.min(180, value);

                e.target.value = value;
            }
        });
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();

    // Collect form data
    const selectedSubjects = getSelectedSubjects();
    const questionsPerSubject = parseInt(document.getElementById('questionsPerSubject').value);

    // Build question counts object with same value for all subjects
    const questionCounts = {};
    selectedSubjects.forEach(subject => {
        questionCounts[subject] = questionsPerSubject;
    });

    const testMode = document.querySelector('input[name="testMode"]:checked')?.value;

    // Validate
    if (selectedSubjects.length === 0) {
        showInfoModal('No Subjects Selected', 'Please select at least one subject for your test.');
        return;
    }

    if (!questionsPerSubject || questionsPerSubject < 5 || questionsPerSubject > 100) {
        showInfoModal('Invalid Question Count', 'Please enter a valid number of questions (5-100, in multiples of 5).');
        return;
    }

    if (questionsPerSubject % 5 !== 0) {
        showInfoModal('Invalid Question Count', 'Number of questions must be in multiples of 5.');
        return;
    }

    if (!testMode) {
        showInfoModal('No Test Mode Selected', 'Please choose between PDF generation or Live Mock Test.');
        return;
    }

    // Build config object
    const config = {
        subjects: selectedSubjects,
        questionCounts: questionCounts,
        questionsPerSubject: questionsPerSubject,
        mode: testMode,
        examType: currentUserData.targetExam || 'JEE'
    };

    if (testMode === 'pdf') {
        const pdfType = document.querySelector('input[name="pdfType"]:checked')?.value;
        if (!pdfType) {
            showInfoModal('PDF Type Required', 'Please select whether you want the PDF with or without solutions.');
            return;
        }
        config.pdfType = pdfType;
        handlePdfGeneration(config);
    } else if (testMode === 'live') {
        const duration = parseInt(document.getElementById('testDuration').value);
        if (!duration || duration < 5 || duration > 180) {
            showInfoModal('Invalid Duration', 'Test duration must be between 5 and 180 minutes.');
            return;
        }
        if (duration % 5 !== 0) {
            showInfoModal('Invalid Duration', 'Test duration must be a multiple of 5 minutes.');
            return;
        }
        config.duration = duration;
        handleLiveTest(config);
    }
}

// Handle PDF generation
async function handlePdfGeneration(config) {
    const solutionText = config.pdfType === 'with-solutions' ? 'with solutions' : 'without solutions';
    const subjectList = config.subjects.join(', ');
    const totalQuestions = Object.values(config.questionCounts).reduce((a, b) => a + b, 0);

    try {
        // Show loading modal
        showLoadingModal(
            'Analyzing Requirements',
            `Designing a unique ${config.examType} custom test for you`,
            8000
        );
        setLoadingStatus('AI is analyzing your requirements...');

        // Prepare subject data for API
        const subjectData = {};
        config.subjects.forEach(subject => {
            subjectData[subject] = {
                chapters: [], // Will use all chapters from syllabus
                num_questions: config.questionCounts[subject],
                difficulty: 'Medium'
            };
        });

        // Step 1: Generate questions
        setProgress(20);
        setLoadingStatus('Calling AI model...');

        const response = await fetch('http://localhost:5000/api/ai/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exam: config.examType,
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

        // Step 2: Generate PDF
        setProgress(70);
        updateLoadingModal(
            '📄 Creating PDF...',
            'Formatting your test paper with beautiful design'
        );
        setLoadingStatus('Generating PDF document...');

        const pdfResponse = await fetch('http://localhost:5000/api/ai/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questions_by_subject: data.by_subject,
                title: `${config.examType} Custom Mock Test`,
                with_solutions: config.pdfType === 'with-solutions'
            })
        });

        if (!pdfResponse.ok) {
            throw new Error('Failed to generate PDF');
        }

        // Download PDF
        setProgress(95);
        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.examType}_Mock_Test_${solutionText.replace(' ', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success
        setProgress(100);
        hideLoadingModal();

        setTimeout(() => {
            showSuccessModal(
                '✅ PDF Generated!',
                `Your test with ${totalQuestions} questions has been downloaded successfully!`,
                3000
            );
        }, 300);

    } catch (error) {
        console.error('PDF generation error:', error);
        hideLoadingModal();

        setTimeout(() => {
            showErrorModal(
                '❌ Generation Failed',
                error.message || 'Failed to generate PDF. Please try again.',
                () => {
                    hideLoadingModal();
                    handlePdfGeneration(config); // Retry
                }
            );
        }, 300);
    }
}

// Handle live test
async function handleLiveTest(config) {
    const subjectList = config.subjects.join(', ');
    const totalQuestions = Object.values(config.questionCounts).reduce((a, b) => a + b, 0);

    try {
        // Show loading modal
        showLoadingModal(
            '🤖 Preparing Your Test...',
            `Generating ${totalQuestions} questions for your ${config.duration}-minute test`,
            8000
        );
        setLoadingStatus('AI is creating your personalized test...');

        // Prepare subject data for API
        const subjectData = {};
        config.subjects.forEach(subject => {
            subjectData[subject] = {
                chapters: [], // Will use all chapters from syllabus
                num_questions: config.questionCounts[subject],
                difficulty: 'Medium'
            };
        });

        // Generate questions
        setProgress(30);
        setLoadingStatus('Calling AI model...');

        const response = await fetch('http://localhost:5000/api/ai/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exam: config.examType,
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
            testId: `test_${Date.now()}`,
            exam: config.examType,
            subjects: config.subjects,
            questions: data.questions,
            by_subject: data.by_subject,
            duration: config.duration,
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
                // TODO: Create live-test.html page
                // For now, show info modal
                hideLoadingModal();
                // Redirect to the new Live Test page
                window.location.href = '../pages/live-test.html';
            }, 1500);
        }, 300);

    } catch (error) {
        console.error('Live test error:', error);
        hideLoadingModal();

        setTimeout(() => {
            showErrorModal(
                '❌ Test Start Failed',
                error.message || 'Failed to start test. Please try again.',
                () => {
                    hideLoadingModal();
                    handleLiveTest(config); // Retry
                }
            );
        }, 300);
    }
}
