import { auth } from '../config/firebase-config.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showInfoModal } from '../utils/info-modal.js';

const db = getFirestore();


// --- State Management ---
let currentState = {
    settings: null,
    questions: [],
    bySubject: {},
    subjects: [],
    currentQuestionIndex: 0,
    answers: {},
    status: {},
    timeLeft: 0,
    timerInterval: null,
    startTime: null,
    testId: null
};

const MARKS = {
    CORRECT: 4,
    WRONG: -1,
    UNATTEMPTED: 0
};

const STATE_KEY = 'liveTestState';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadTestFromStorage();
    setupEventListeners();
});

function loadTestFromStorage() {
    try {
        const storedData = sessionStorage.getItem('currentTest');
        if (!storedData) {
            console.error('No test data in sessionStorage');
            alert('No test data found. Redirecting to dashboard.');
            window.location.href = 'mocktest.html';
            return;
        }

        const data = JSON.parse(storedData);
        console.log('Loaded test data:', data);

        // Check if there's saved state (from refresh)
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            // Verify it's the same test
            if (parsed.testId === data.testId) {
                console.log('Restoring saved state from refresh');
                initializeTest(data, parsed);
                return;
            }
        }

        // Fresh test start
        initializeTest(data, null);
    } catch (e) {
        console.error("Failed to load test:", e);
        alert('Error loading test data: ' + e.message);
        window.location.href = 'mocktest.html';
    }
}

function initializeTest(data, savedState) {
    const flatQuestions = [];
    const subjects = data.subjects || [];

    subjects.forEach(subj => {
        if (data.by_subject[subj]) {
            data.by_subject[subj].forEach(q => {
                flatQuestions.push({
                    ...q,
                    globalIndex: flatQuestions.length,
                    subject: subj
                });
            });
        }
    });

    currentState.testId = data.testId;
    currentState.settings = {
        exam: data.exam,
        duration: data.duration,
        subjects: subjects
    };
    currentState.questions = flatQuestions;
    currentState.bySubject = data.by_subject;
    currentState.subjects = subjects;

    if (savedState) {
        // Restore from saved state
        currentState.answers = savedState.answers || {};
        currentState.status = savedState.status || {};
        currentState.currentQuestionIndex = savedState.currentQuestionIndex || 0;
        currentState.timeLeft = savedState.timeLeft || (data.duration * 60);
    } else {
        // Initialize fresh
        flatQuestions.forEach(q => {
            currentState.status[q.id] = 'not-visited';
        });
        currentState.timeLeft = data.duration * 60;
    }

    // Update UI
    document.getElementById('examName').textContent = data.exam;
    document.getElementById('subjectName').textContent = subjects.join(' + ');

    renderSubjectTabs();
    loadQuestion(currentState.currentQuestionIndex);
    renderPalette();
    startTimer(currentState.timeLeft);
}

// --- State Persistence ---
function saveState() {
    const state = {
        testId: currentState.testId,
        answers: currentState.answers,
        status: currentState.status,
        currentQuestionIndex: currentState.currentQuestionIndex,
        timeLeft: currentState.timeLeft
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function clearSavedState() {
    localStorage.removeItem(STATE_KEY);
}

// --- UI Rendering ---
function renderSubjectTabs() {
    const container = document.getElementById('subjectTabs');
    container.innerHTML = '';

    currentState.subjects.forEach(subj => {
        const btn = document.createElement('div');
        btn.className = 'subject-tab';
        btn.textContent = subj;
        btn.onclick = () => jumpToSubject(subj);
        container.appendChild(btn);
    });
}

function updateActiveTab(subject) {
    document.querySelectorAll('.subject-tab').forEach(tab => {
        if (tab.textContent === subject) tab.classList.add('active');
        else tab.classList.remove('active');
    });
}

function renderPalette() {
    const grid = document.getElementById('paletteGrid');
    grid.innerHTML = '';

    currentState.questions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.className = `palette-btn ${currentState.status[q.id] || 'not-visited'}`;
        if (idx === currentState.currentQuestionIndex) btn.classList.add('current');

        btn.textContent = idx + 1;
        btn.onclick = () => loadQuestion(idx);

        grid.appendChild(btn);
    });
}

function loadQuestion(index) {
    if (index < 0 || index >= currentState.questions.length) return;

    currentState.currentQuestionIndex = index;
    const q = currentState.questions[index];

    if (currentState.status[q.id] === 'not-visited') {
        currentState.status[q.id] = 'not-answered';
    }

    document.getElementById('currentQNum').textContent = index + 1;
    document.getElementById('qText').innerHTML = formatText(q.question);

    renderOptions(q);
    renderPalette();
    updateActiveTab(q.subject);

    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').textContent = index === currentState.questions.length - 1 ? 'Finish Test' : 'Save & Next →';

    // Trigger MathJax to render LaTeX
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([
            document.getElementById('qText'),
            document.getElementById('optionsGrid')
        ]).catch((err) => console.log('MathJax rendering error:', err));
    }

    // Save state after navigation
    saveState();
}

function renderOptions(question) {
    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';

    // Check query type (default to mcq if missing)
    const type = question.type || 'mcq';

    if (type === 'numerical') {
        const container = document.createElement('div');
        container.className = 'numerical-input-container';
        container.style.padding = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';

        const label = document.createElement('label');
        label.textContent = 'Enter your numerical answer (Integer):';
        label.style.fontWeight = 'bold';
        label.style.color = '#fff';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'numerical-input';
        input.placeholder = 'Type your answer here...';
        input.value = currentState.answers[question.id] || '';

        // Styling for the input
        input.style.padding = '12px';
        input.style.fontSize = '18px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid #444';
        input.style.backgroundColor = '#2a2a2a';
        input.style.color = '#fff';
        input.style.width = '100%';
        input.style.maxWidth = '300px';

        input.oninput = (e) => {
            saveNumericalAnswer(question.id, e.target.value);
        };

        container.appendChild(label);
        container.appendChild(input);
        grid.appendChild(container);
        return;
    }

    // MCQ Handling
    const selectedAns = currentState.answers[question.id];

    ['A', 'B', 'C', 'D'].forEach(optKey => {
        if (question.options && question.options[optKey]) {
            const el = document.createElement('div');
            el.className = `option-item ${selectedAns === optKey ? 'selected' : ''}`;
            el.onclick = () => selectOption(question.id, optKey);

            // Format option text
            const formattedOpt = formatText(question.options[optKey]);

            el.innerHTML = `
                <div class="option-label">${optKey}</div>
                <div class="option-text">${formattedOpt}</div>
            `;
            grid.appendChild(el);
        }
    });

    // Re-render MathJax for the new options
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([grid]).catch(err => console.log('MathJax error:', err));
    }
}

function selectOption(qId, optKey) {
    currentState.answers[qId] = optKey;

    if (currentState.status[qId] !== 'marked') {
        currentState.status[qId] = 'answered';
    }

    renderOptions(currentState.questions[currentState.currentQuestionIndex]);
    renderPalette();
    saveState();
}

function saveNumericalAnswer(qId, value) {
    currentState.answers[qId] = value;

    if (value && value.trim() !== '') {
        if (currentState.status[qId] !== 'marked') {
            currentState.status[qId] = 'answered';
        }
    } else {
        // If cleared, keep as visited but not answered? 
        // Or if strictly not answered, set to not-visited or visited?
        // Usually we keep 'not-answered' if visited.
        if (currentState.status[qId] !== 'marked') {
            currentState.status[qId] = 'not-answered';
        }
    }

    renderPalette();
    saveState();
}

function formatText(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*([^\*]+)\*/g, '<i>$1</i>'); // Support italics
}

function jumpToSubject(subject) {
    const firstQIndex = currentState.questions.findIndex(q => q.subject === subject);
    if (firstQIndex !== -1) {
        loadQuestion(firstQIndex);
    }
}

// --- Timer ---
function startTimer(durationSeconds) {
    currentState.timeLeft = durationSeconds;
    updateTimerDisplay();

    currentState.timerInterval = setInterval(() => {
        currentState.timeLeft--;
        updateTimerDisplay();
        saveState(); // Save timer state

        if (currentState.timeLeft <= 0) {
            clearInterval(currentState.timerInterval);
            submitTest(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const h = Math.floor(currentState.timeLeft / 3600);
    const m = Math.floor((currentState.timeLeft % 3600) / 60);
    const s = currentState.timeLeft % 60;

    const display = `${pad(h)}:${pad(m)}:${pad(s)} `;
    document.getElementById('timerDisplay').textContent = display;

    const container = document.getElementById('timerContainer');
    if (currentState.timeLeft < 300) {
        container.classList.add('timer-warning');
    }
}

function pad(n) {
    return n.toString().padStart(2, '0');
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('prevBtn').onclick = () => {
        loadQuestion(currentState.currentQuestionIndex - 1);
    };

    document.getElementById('nextBtn').onclick = () => {
        const isLast = currentState.currentQuestionIndex === currentState.questions.length - 1;
        if (isLast) {
            showConfirmModal();
        } else {
            loadQuestion(currentState.currentQuestionIndex + 1);
        }
    };

    document.getElementById('markReviewBtn').onclick = () => {
        const qId = currentState.questions[currentState.currentQuestionIndex].id;
        currentState.status[qId] = 'marked';
        renderPalette();
        saveState();
        loadQuestion(currentState.currentQuestionIndex + 1);
    };

    document.getElementById('clearResponseBtn').onclick = () => {
        const qId = currentState.questions[currentState.currentQuestionIndex].id;
        delete currentState.answers[qId];
        currentState.status[qId] = 'not-answered';

        renderOptions(currentState.questions[currentState.currentQuestionIndex]);
        renderPalette();
        saveState();
    };

    document.getElementById('submitTestBtn').onclick = showConfirmModal;

    // Confirm Modal
    document.getElementById('confirmCancelBtn').onclick = hideConfirmModal;
    document.getElementById('confirmSubmitBtn').onclick = () => {
        hideConfirmModal();
        submitTest(false);
    };

    // Result Modal
    document.getElementById('restartBtn').onclick = () => {
        clearSavedState();
        sessionStorage.removeItem('testResults');
        window.location.href = 'mocktest.html';
    };

    document.getElementById('viewAnalysisBtn').onclick = () => {
        window.location.href = 'test-analysis.html';
    };

    // User Name
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Student';
            const initial = (user.displayName || 'u').charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = initial;
        }
    });
}

// --- Custom Confirm Modal ---
function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    });
}

function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// --- Submission ---
function submitTest(auto) {
    clearInterval(currentState.timerInterval);
    clearSavedState();

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalScore = 0;

    // Calculate subject-wise performance
    const subjectWise = {};
    currentState.subjects.forEach(subj => {
        subjectWise[subj] = { correct: 0, wrong: 0, skipped: 0 };
    });

    // Prepare detailed question data for analysis
    const questionsForAnalysis = [];

    currentState.questions.forEach(q => {
        const userAns = currentState.answers[q.id];
        let status = 'skipped';
        let isCorrect = false;

        // Check correctness based on question type
        if (userAns) {
            if (q.type === 'numerical') {
                // Approximate comparison for integers (handle string vs number)
                isCorrect = parseInt(userAns) === parseInt(q.correct);
            } else {
                // Strict equality for MCQs (A/B/C/D)
                isCorrect = userAns === q.correct;
            }
        }

        if (!userAns) {
            skipped++;
            subjectWise[q.subject].skipped++;
        } else if (isCorrect) {
            correct++;
            totalScore += MARKS.CORRECT;
            subjectWise[q.subject].correct++;
            status = 'correct';
        } else {
            wrong++;
            totalScore += MARKS.WRONG;
            subjectWise[q.subject].wrong++;
            status = 'wrong';
        }

        // Store question data for analysis
        questionsForAnalysis.push({
            id: q.id,
            question: q.question,
            options: q.options,
            correct: q.correct,
            userAnswer: userAns || null,
            status: status,
            subject: q.subject,
            solution: q.explanation || q.solution || `The correct answer is ${q.correct}. ${q.options[q.correct]} `
        });
    });

    // Calculate time taken
    const testDuration = currentState.settings.duration * 60;
    const timeTaken = testDuration - currentState.timeLeft;

    // Store comprehensive results for analysis page
    const testResults = {
        testId: currentState.testId,
        exam: currentState.settings.exam,
        subjects: currentState.subjects,
        totalQuestions: currentState.questions.length,
        correct: correct,
        wrong: wrong,
        skipped: skipped,
        score: totalScore,
        timeTaken: timeTaken,
        subjectWise: subjectWise,
        questions: questionsForAnalysis,
        timestamp: new Date().toISOString()
    };

    sessionStorage.setItem('testResults', JSON.stringify(testResults));

    // Update user statistics in Firestore (Always update for any attempt)
    try {
        updateUserStats(timeTaken);
        saveTestResults(testResults, totalScore);
    } catch (e) {
        console.error("Stats update failed trigger:", e);
    }

    // Show Results
    document.getElementById('finalScore').textContent = `${totalScore}/${currentState.questions.length * MARKS.CORRECT}`;
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('skippedCount').textContent = skipped;

    const modal = document.getElementById('resultModal');
    modal.style.display = 'flex';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    });
}

// Update user statistics in Firestore
async function updateUserStats(timeTaken) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const statsRef = doc(db, 'users', user.uid, 'stats', 'summary');
        const statsDoc = await getDoc(statsRef);

        const today = new Date().toISOString().split('T')[0];
        const hoursFromTest = timeTaken / 3600;

        let stats = {
            currentStreak: 1,
            longestStreak: 1,
            lastTestDate: today,
            totalHoursStudied: hoursFromTest,
            bestDailyHours: hoursFromTest,
            totalTestsCompleted: 1,
            bestDailyTests: 1,
            today: {
                date: today,
                testsCompleted: 1,
                hoursStudied: hoursFromTest
            }
        };

        if (statsDoc.exists()) {
            const existing = statsDoc.data();

            // Streak
            const lastDate = existing.lastTestDate || '';
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                stats.currentStreak = (existing.currentStreak || 0) + 1;
            } else if (lastDate === today) {
                stats.currentStreak = existing.currentStreak || 1;
            } else {
                stats.currentStreak = 1;
            }
            stats.longestStreak = Math.max(stats.currentStreak, existing.longestStreak || 0);

            // Totals
            stats.totalHoursStudied = (existing.totalHoursStudied || 0) + hoursFromTest;
            stats.totalTestsCompleted = (existing.totalTestsCompleted || 0) + 1;

            // Daily & Best
            if (existing.today && existing.today.date === today) {
                stats.today = {
                    date: today,
                    testsCompleted: (existing.today.testsCompleted || 0) + 1,
                    hoursStudied: (existing.today.hoursStudied || 0) + hoursFromTest
                };
            } else {
                stats.today = {
                    date: today,
                    testsCompleted: 1,
                    hoursStudied: hoursFromTest
                };
            }
            stats.bestDailyHours = Math.max(stats.today.hoursStudied, existing.bestDailyHours || 0);
            stats.bestDailyTests = Math.max(stats.today.testsCompleted, existing.bestDailyTests || 0);
            stats.lastTestDate = today;
        }

        await setDoc(statsRef, stats);

    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Save detailed test results to history collection
async function saveTestResults(results, score) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const historyRef = collection(db, 'users', user.uid, 'testHistory');

        // Prepare simplified history object
        const historyEntry = {
            testId: results.testId || 'unknown',
            testTitle: results.examType ? `${results.examType} Mock Test` : 'Custom Test',
            score: score,
            totalMarks: results.questions.length * MARKS.CORRECT,
            percentage: Math.round((score / (results.questions.length * MARKS.CORRECT)) * 100),
            date: new Date().toISOString(),
            createdAt: serverTimestamp(),
            timeTaken: results.timeTaken || 0,
            subject: results.subject || 'Mixed'
        };

        await addDoc(historyRef, historyEntry);
        console.log('✅ Test history saved:', historyEntry);
    } catch (error) {
        console.error('❌ Error saving test history:', error);
    }
}
