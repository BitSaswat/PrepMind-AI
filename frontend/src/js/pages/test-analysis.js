import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- State ---
let testResults = null;
let pieChart = null;
let barChart = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadTestResults();
    setupEventListeners();
});

function loadTestResults() {
    try {
        const storedResults = sessionStorage.getItem('testResults');
        if (!storedResults) {
            alert('No test results found. Redirecting to dashboard.');
            window.location.href = 'mocktest.html';
            return;
        }

        testResults = JSON.parse(storedResults);
        console.log('Loaded test results:', testResults);

        // Render all sections
        renderOverview();
        renderCharts();
        renderInsights();
        renderQuestions();
    } catch (e) {
        console.error('Failed to load test results:', e);
        alert('Error loading test results.');
        window.location.href = 'mocktest.html';
    }
}

// --- Overview Section ---
function renderOverview() {
    const { score, totalQuestions, correct, wrong, skipped, timeTaken } = testResults;
    const maxScore = totalQuestions * 4;

    // Score
    document.getElementById('totalScore').textContent = `${score}/${maxScore}`;
    const scorePercent = (score / maxScore) * 100;
    setTimeout(() => {
        document.getElementById('scoreProgress').style.width = `${Math.max(0, scorePercent)}%`;
    }, 300);

    // Accuracy
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    setTimeout(() => {
        document.getElementById('accuracyProgress').style.width = `${accuracy}%`;
    }, 400);

    // Time
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    document.getElementById('timeTaken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const avgTime = (timeTaken / totalQuestions).toFixed(1);
    document.getElementById('avgTime').textContent = `Avg: ${avgTime}s/question`;

    // Attempt Rate
    const attemptRate = ((attempted / totalQuestions) * 100).toFixed(1);
    document.getElementById('attemptRate').textContent = `${attemptRate}%`;
    setTimeout(() => {
        document.getElementById('attemptProgress').style.width = `${attemptRate}%`;
    }, 500);

    // Counts
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('skippedCount').textContent = skipped;

    // Header info
    document.getElementById('examType').textContent = testResults.exam || 'Test';
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('testDate').textContent = date;
}

// --- Charts ---
function renderCharts() {
    const { correct, wrong, skipped, subjectWise } = testResults;

    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Wrong', 'Skipped'],
            datasets: [{
                data: [correct, wrong, skipped],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(148, 163, 184, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            cutout: '65%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    // Bar Chart - Subject-wise
    if (subjectWise && Object.keys(subjectWise).length > 0) {
        const subjects = Object.keys(subjectWise);
        const accuracies = subjects.map(subj => {
            const data = subjectWise[subj];
            const attempted = data.correct + data.wrong;
            return attempted > 0 ? ((data.correct / attempted) * 100).toFixed(1) : 0;
        });

        const barCtx = document.getElementById('barChart').getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: subjects,
                datasets: [{
                    label: 'Accuracy (%)',
                    data: accuracies,
                    backgroundColor: 'rgba(0, 113, 227, 0.8)',
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `Accuracy: ${context.parsed.y}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
}

// --- Insights ---
function renderInsights() {
    const { subjectWise, correct, wrong, totalQuestions, timeTaken } = testResults;

    // Strengths
    const strengthsList = document.getElementById('strengthsList');
    const strengths = [];

    if (subjectWise) {
        Object.entries(subjectWise).forEach(([subject, data]) => {
            const attempted = data.correct + data.wrong;
            const accuracy = attempted > 0 ? (data.correct / attempted) * 100 : 0;
            if (accuracy >= 70) {
                strengths.push(`Strong performance in ${subject} (${accuracy.toFixed(0)}% accuracy)`);
            }
        });
    }

    if (correct > wrong) {
        strengths.push('More correct answers than wrong - good accuracy!');
    }

    const avgTime = timeTaken / totalQuestions;
    if (avgTime < 90) {
        strengths.push('Efficient time management - quick problem solving');
    }

    if (strengths.length === 0) {
        strengths.push('Keep practicing to identify your strengths');
    }

    strengthsList.innerHTML = strengths.map(s => `<li>${s}</li>`).join('');

    // Weaknesses
    const weaknessesList = document.getElementById('weaknessesList');
    const weaknesses = [];

    if (subjectWise) {
        Object.entries(subjectWise).forEach(([subject, data]) => {
            const attempted = data.correct + data.wrong;
            const accuracy = attempted > 0 ? (data.correct / attempted) * 100 : 0;
            if (accuracy < 50 && attempted > 0) {
                weaknesses.push(`Need improvement in ${subject} (${accuracy.toFixed(0)}% accuracy)`);
            }
        });
    }

    if (wrong > correct) {
        weaknesses.push('More wrong answers than correct - review concepts carefully');
    }

    const skippedPercent = (testResults.skipped / totalQuestions) * 100;
    if (skippedPercent > 30) {
        weaknesses.push(`High skip rate (${skippedPercent.toFixed(0)}%) - work on attempting more questions`);
    }

    if (weaknesses.length === 0) {
        weaknesses.push('Great job! Keep up the consistent performance');
    }

    weaknessesList.innerHTML = weaknesses.map(w => `<li>${w}</li>`).join('');

    // Recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    const recommendations = [];

    if (subjectWise) {
        const weakSubjects = Object.entries(subjectWise)
            .filter(([_, data]) => {
                const attempted = data.correct + data.wrong;
                const accuracy = attempted > 0 ? (data.correct / attempted) * 100 : 0;
                return accuracy < 60;
            })
            .map(([subject]) => subject);

        if (weakSubjects.length > 0) {
            recommendations.push(`Focus on: ${weakSubjects.join(', ')}`);
        }
    }

    if (wrong > 0) {
        recommendations.push('Review all wrong answers and understand the solutions');
    }

    if (testResults.skipped > 5) {
        recommendations.push('Practice more to build confidence in attempting questions');
    }

    recommendations.push('Take regular mock tests to track improvement');
    recommendations.push('Analyze time spent per question to optimize speed');

    recommendationsList.innerHTML = recommendations.map(r => `<li>${r}</li>`).join('');
}

// --- Questions Review ---
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    testResults.questions.forEach((q, index) => {
        const card = createQuestionCard(q, index);
        container.appendChild(card);
    });

    // Trigger MathJax to render LaTeX in all questions
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([container])
            .catch((err) => console.log('MathJax rendering error:', err));
    }
}

function createQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.status = question.status;

    const statusText = question.status === 'correct' ? '✓ Correct' :
        question.status === 'wrong' ? '✗ Wrong' : '○ Skipped';

    card.innerHTML = `
        <div class="question-header-bar">
            <div class="question-header-left">
                <span class="question-number">Q${index + 1}</span>
                <span class="status-badge ${question.status}">${statusText}</span>
            </div>
            <span class="expand-icon">▼</span>
        </div>
        <div class="question-body">
            <div class="question-content-area">
                <div class="question-text">${formatText(question.question)}</div>
                <div class="options-review">
                    ${renderOptionsReview(question)}
                </div>
                ${question.solution ? `
                    <div class="solution-section">
                        <div class="solution-title">💡 Solution</div>
                        <div class="solution-text">${formatText(question.solution || question.explanation || 'Solution not available')}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Toggle expand
    const header = card.querySelector('.question-header-bar');
    header.addEventListener('click', () => {
        card.classList.toggle('expanded');
    });

    return card;
}

function renderOptionsReview(question) {
    // Check for numerical type
    if (question.type === 'numerical') {
        const userAnswer = question.userAnswer !== undefined && question.userAnswer !== null ? question.userAnswer : 'Not Attempted';
        const correctAnswer = question.correct;
        const isCorrect = question.status === 'correct';
        const isWrong = question.status === 'wrong';
        const isSkipped = question.status === 'skipped'; // or simply not correct/wrong

        let userColor = '#94a3b8'; // default/skipped
        if (isCorrect) userColor = '#22c55e';
        else if (isWrong) userColor = '#ef4444';

        return `
            <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 10px;">
                <div style="margin-bottom: 10px; font-size: 1.1em;">
                    <span style="color: #bbb;">Your Answer:</span>
                    <span style="font-weight: bold; color: ${userColor}; margin-left: 10px;">${userAnswer}</span>
                    ${isCorrect ? '<span style="color: #22c55e; margin-left: 10px;">✓</span>' : ''}
                    ${isWrong ? '<span style="color: #ef4444; margin-left: 10px;">✗</span>' : ''}
                </div>
                <div style="font-size: 1.1em;">
                    <span style="color: #bbb;">Correct Answer:</span>
                    <span style="font-weight: bold; color: #22c55e; margin-left: 10px;">${correctAnswer}</span>
                </div>
            </div>
        `;
    }

    // MCQ Logic
    const options = ['A', 'B', 'C', 'D'];
    return options.map(opt => {
        if (!question.options || !question.options[opt]) return '';

        const isUserAnswer = question.userAnswer === opt;
        const isCorrect = question.correct === opt;

        let classes = 'option-review-item';
        let indicator = ''; // HTML string

        if (isCorrect) {
            classes += ' correct-answer';
            indicator = '<span class="option-indicator" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">Correct Answer</span>';
        }

        if (isUserAnswer && !isCorrect) {
            classes += ' wrong-answer';
            indicator = '<span class="option-indicator" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">Your Answer</span>';
        } else if (isUserAnswer && isCorrect) {
            indicator = '<span class="option-indicator" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">Your Answer ✓</span>';
        }

        return `
            <div class="${classes}">
                <div class="option-label-review">${opt}</div>
                <div class="option-text-review">${formatText(question.options[opt])}</div>
                ${indicator}
            </div>
        `;
    }).join('');
}

function formatText(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*([^\*]+)\*/g, '<i>$1</i>');
}

// --- Event Listeners ---
function setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        sessionStorage.removeItem('testResults');
        window.location.href = 'mocktest.html';
    });

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter questions
            const filter = btn.dataset.filter;
            const cards = document.querySelectorAll('.question-card');

            cards.forEach(card => {
                if (filter === 'all' || card.dataset.status === filter) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}
