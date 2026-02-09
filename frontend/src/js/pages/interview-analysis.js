/**
 * Interview Analysis Page
 * Displays detailed performance analysis after interview
 */

// Import configuration
import Config from '../config.js';

// Load interview data from localStorage
const interviewData = JSON.parse(localStorage.getItem('lastInterviewData') || '{}');

console.log("Loaded Interview Data:", interviewData); // Debug log

if (!interviewData.transcript || !interviewData.transcript.length) {
    // No interview data found, simple alert and redirect
    // Use a small timeout to allow the console log to happen
    setTimeout(() => {
        if (!confirm('No interview data found. Would you like to start a new interview?')) {
            window.location.href = '/src/pages/mocktest.html';
        } else {
            window.location.href = '/src/pages/mocktest.html';
        }
    }, 500);
} else {
    // Initialize page
    displayBasicStats();
    displayTranscript();
    generateAIAnalysis();
}

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/src/pages/mocktest.html';
});

/**
 * Display basic statistics that don't need AI
 */
function displayBasicStats() {
    const duration = interviewData.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    document.getElementById('durationValue').textContent = `${minutes}m ${seconds}s`;

    // Count exchanges (AI + Candidate)
    const exchanges = interviewData.transcript.filter(
        t => t.speaker === 'ai' || t.speaker === 'candidate'
    ).length;
    document.getElementById('exchangesValue').textContent = exchanges;

    // Word count for candidate
    const candidateWords = interviewData.transcript
        .filter(t => t.speaker === 'candidate')
        .reduce((acc, t) => acc + (t.text ? t.text.split(' ').length : 0), 0);

    document.getElementById('wordCountValue').textContent = candidateWords;
}

/**
 * Display full transcript
 */
function displayTranscript() {
    const viewer = document.getElementById('transcriptViewer');
    viewer.innerHTML = '';

    if (!interviewData.transcript || interviewData.transcript.length === 0) {
        viewer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No transcript available</p>';
        return;
    }

    interviewData.transcript.forEach(entry => {
        const line = document.createElement('div');
        line.className = 'transcript-line';

        const speakerSpan = document.createElement('span');
        // Add specific class for easy CSS targeting (ai, candidate, system)
        speakerSpan.className = `speaker ${entry.speaker}`;
        speakerSpan.textContent = entry.speaker === 'ai' ? 'AI Interviewer' :
            entry.speaker === 'candidate' ? 'You' : 'System';

        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = entry.text;

        // Structure: 
        // <div class="transcript-line">
        //    <span class="speaker ai">AI Interviewer</span>
        //    <span class="text">Hello...</span>
        // </div>
        line.appendChild(speakerSpan);
        line.appendChild(textSpan);

        viewer.appendChild(line);
    });
}

/**
 * Generate AI analysis using Gemini
 */
async function generateAIAnalysis() {
    try {
        // Prepare transcript for analysis
        const transcriptText = interviewData.transcript
            .map(t => `${t.speaker.toUpperCase()}: ${t.text}`)
            .join('\n');

        // Call backend to generate analysis using Config
        const apiURL = Config.getAPIURL();
        const response = await fetch(`${apiURL}/analyze-interview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transcript: transcriptText,
                duration: interviewData.duration
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate analysis');
        }

        const data = await response.json();
        const analysis = data.analysis;

        console.log("Analysis Data:", analysis);

        if (analysis.overall_summary) {
            populateUI(analysis);
        } else {
            // Fallback for legacy/string response
            document.getElementById('overallSummaryText').innerHTML = typeof analysis === 'string' ? analysis.replace(/\n/g, '<br>') : 'Analysis unavailable';
        }

    } catch (error) {
        console.error('Error generating analysis:', error);
        document.getElementById('overallSummaryText').textContent = 'Unable to generate analysis. Please try again later.';
    }
}

/**
 * Populate all UI elements with data
 */
function populateUI(data) {
    // 1. Overall Summary
    document.getElementById('overallSummaryText').textContent = data.overall_summary || "No summary provided.";

    // 2. Scores & Progress Bars
    updateMetric('comm', data.communication_score, data.communication_feedback);
    updateMetric('know', data.knowledge_score, data.knowledge_feedback);
    updateMetric('think', data.critical_thinking_score, data.critical_thinking_feedback);
    updateMetric('prof', data.professionalism_score, data.professionalism_feedback);

    // 3. Overall Score (Average of 4 metrics)
    const avgScore = Math.round(
        (data.communication_score + data.knowledge_score + data.critical_thinking_score + data.professionalism_score) / 4
    );
    // Calculated out of 250
    const percent = Math.round((avgScore / 250) * 100);

    document.getElementById('overallScoreValue').textContent = `${avgScore}/250`;
    document.getElementById('overallProgress').style.width = `${percent}%`;

    // 4. Insights Lists
    populateList('strengthsList', data.strengths);
    populateList('weaknessesList', data.weaknesses);
    populateList('recommendationsList', data.recommendations);
}

/**
 * Helper to update a metric card
 */
function updateMetric(prefix, score, feedback) {
    const badge = document.getElementById(`${prefix}Badge`);
    const progress = document.getElementById(`${prefix}Progress`);
    const text = document.getElementById(`${prefix}Feedback`);

    const percent = Math.round((score / 250) * 100);

    if (badge) badge.textContent = `${score}/250`; // Show raw score
    if (progress) progress.style.width = `${percent}%`; // Width based on percentage
    if (text) text.textContent = feedback;
}

/**
 * Helper to populate insight lists
 */
function populateList(elementId, items) {
    const list = document.getElementById(elementId);
    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = '<li>No specific items identified.</li>';
        return;
    }

    list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}
