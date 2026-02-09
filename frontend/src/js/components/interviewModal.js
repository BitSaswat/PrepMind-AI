/**
 * Interview Modal Component
 * Handles UPSC AI Interview modal display and WebSocket communication
 */

// Import configuration
import Config from '../config.js';

let ws = null;
let mediaRecorder = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let currentTranscriptLine = null;

// Interview tracking
let interviewStartTime = null;
let interviewTimer = null;
let interviewTranscript = [];
const MAX_INTERVIEW_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Show the interview modal
 */
export function showInterviewModal() {
    // Create modal HTML
    const modalHTML = `
    <div class="interview-modal-overlay" id="interviewModalOverlay">
      <div class="interview-modal">
        <!-- Header -->
        <div class="modal-header">
          <h2>UPSC AI Interview 🎤</h2>
          <div class="header-right">
            <div class="status-pill" id="connectionStatus">
              <span class="status-dot"></span>
              <span>Connecting...</span>
            </div>
            <button class="close-btn" id="closeInterviewModal">×</button>
          </div>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Left: Controls -->
          <div class="interview-controls">
            <!-- AI Card -->
            <div class="participant-card ai-card" id="aiCard">
                <div class="ai-visual-container">
                    <div class="ai-fluid-blob"></div>
                    <div class="ai-fluid-blob-blur"></div>
                </div>
              <div class="participant-name">AI Interviewer</div>
              <div class="participant-status" id="aiStatus">Ready</div>
            </div>

            <!-- Candidate Card -->
            <div class="participant-card candidate-card" id="candidateCard">
              <div class="user-avatar-visual">YOU</div>
              <div class="participant-name">Candidate</div>
              <div class="participant-status" id="candidateStatus">Offline</div>
            </div>

            <!-- Buttons -->
            <div class="button-group">
              <button class="btn btn-primary" id="startInterviewBtn">Start Interview</button>
              <button class="btn btn-danger" id="endInterviewBtn" disabled>End Interview</button>
            </div>
          </div>

          <!-- Right: Transcript -->
          <div class="transcript-panel">
            <h3>Transcript</h3>
            <div class="transcript-content" id="transcriptContent"></div>
          </div>
        </div>
      </div>
    </div>
  `;

    // Remove existing modal if any
    const existing = document.getElementById('interviewModalOverlay');
    if (existing) {
        existing.remove();
    }

    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get elements
    const overlay = document.getElementById('interviewModalOverlay');
    const closeBtn = document.getElementById('closeInterviewModal');
    const startBtn = document.getElementById('startInterviewBtn');
    const endBtn = document.getElementById('endInterviewBtn');

    // Show modal with animation
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    // Initialize WebSocket connection
    initializeWebSocket();

    // Event listeners
    closeBtn.addEventListener('click', hideInterviewModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideInterviewModal();
        }
    });

    startBtn.addEventListener('click', startInterview);
    endBtn.addEventListener('click', endInterview);

    // ESC key to close
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            hideInterviewModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

/**
 * Hide the interview modal
 */
export function hideInterviewModal() {
    const overlay = document.getElementById('interviewModalOverlay');
    if (!overlay) return;

    // Cleanup
    cleanup();

    // Hide with animation
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.remove();
    }, 350);
}

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
    const statusPill = document.getElementById('connectionStatus');
    const wsURL = Config.getWebSocketURL();

    console.log(`🔌 Connecting to WebSocket: ${wsURL}`);

    try {
        ws = new WebSocket(wsURL);

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            updateConnectionStatus(true);
            updateCandidateStatus('Ready');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleServerMessage(message);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            updateConnectionStatus(false);
        };

        ws.onclose = () => {
            console.log('⚠️ WebSocket closed');
            updateConnectionStatus(false);
            updateCandidateStatus('Offline');
        };

    } catch (error) {
        console.error('Failed to connect:', error);
        updateConnectionStatus(false);
    }
}

/**
 * Handle messages from server
 */
function handleServerMessage(message) {
    const { type, data, reason } = message;

    switch (type) {
        case 'connected':
            console.log('Server ready:', data);
            break;

        case 'audioStream':
            // Queue audio for playback
            queueAudio(data);
            updateAIStatus('Speaking');
            break;

        case 'textStream':
            // Update transcript - only if data exists
            if (data) {
                appendToTranscript('ai', data);
            }
            break;

        case 'terminateForViolation':
            // Interview terminated due to inappropriate language - SHOW DANGER UI
            appendToTranscript('system', `⚠️ INTERVIEW TERMINATED: ${reason}`);
            showTerminationModal(reason);
            endInterview();
            break;

        case 'error':
            console.error('Server error:', data);
            alert(`Error: ${data}`);
            break;
    }
}

/**
 * Start interview
 */
async function startInterview() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server. Please wait or refresh.');
        return;
    }

    // Request microphone permission
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        // Start capturing audio
        startAudioCapture(stream);

        // Send start message to server
        ws.send(JSON.stringify({
            type: 'startInterview',
            interviewTarget: 'UPSC Civil Services'
        }));

        // Start interview tracking
        interviewStartTime = Date.now();
        interviewTranscript = [];

        // Set 30-minute timer
        interviewTimer = setTimeout(() => {
            alert('Interview time limit (30 minutes) reached. Interview will now end.');
            endInterview();
        }, MAX_INTERVIEW_DURATION);

        // Update UI
        document.getElementById('startInterviewBtn').disabled = true;
        document.getElementById('endInterviewBtn').disabled = false;
        updateCandidateStatus('Listening');

        appendToTranscript('system', 'Interview started');

    } catch (error) {
        console.error('Microphone access denied:', error);
        alert('Could not access microphone. Please grant permission and try again.');
    }
}

/**
 * End interview
 */
function endInterview() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'endInterview' }));
    }

    // Clear timer
    if (interviewTimer) {
        clearTimeout(interviewTimer);
        interviewTimer = null;
    }

    // Calculate duration
    const duration = interviewStartTime ? Math.floor((Date.now() - interviewStartTime) / 1000) : 0;

    // Stop audio capture but keep WebSocket open
    if (mediaRecorder) {
        if (mediaRecorder.processor) {
            mediaRecorder.processor.disconnect();
        }
        if (mediaRecorder.source) {
            mediaRecorder.source.disconnect();
        }
        if (mediaRecorder.audioCtx) {
            mediaRecorder.audioCtx.close();
        }
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        mediaRecorder = null;
    }

    // Clear audio queue
    audioQueue = [];
    isPlaying = false;
    currentTranscriptLine = null;

    // Store interview data for analysis
    const interviewData = {
        duration,
        transcript: interviewTranscript,
        endTime: Date.now(),
        startTime: interviewStartTime
    };
    localStorage.setItem('lastInterviewData', JSON.stringify(interviewData));

    // Update UI
    document.getElementById('startInterviewBtn').disabled = false;
    document.getElementById('endInterviewBtn').disabled = true;
    updateCandidateStatus('Ready');
    updateAIStatus('Ready');

    // Close modal
    setTimeout(() => {
        hideInterviewModal();
        // Redirect to analysis page
        window.location.href = '/src/pages/interview-analysis.html';
    }, 500);
}

/**
 * Start audio capture from microphone
 */
async function startAudioCapture(stream) {
    try {
        // Create audio context with native sample rate
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);

        // Create a script processor for audio capture
        const bufferSize = 4096;
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

        processor.onaudioprocess = (e) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);

            // Resample to 16kHz if needed
            const targetSampleRate = 16000;
            const sourceSampleRate = audioCtx.sampleRate;

            let resampledData;
            if (sourceSampleRate !== targetSampleRate) {
                const ratio = sourceSampleRate / targetSampleRate;
                const targetLength = Math.floor(inputData.length / ratio);
                resampledData = new Float32Array(targetLength);

                for (let i = 0; i < targetLength; i++) {
                    const sourceIndex = Math.floor(i * ratio);
                    resampledData[i] = inputData[sourceIndex];
                }
            } else {
                resampledData = inputData;
            }

            // Convert to PCM16
            const pcm16 = convertToPCM16(resampledData);
            const base64Audio = arrayBufferToBase64(pcm16);

            // Send to server
            ws.send(JSON.stringify({
                type: 'realtimeInput',
                data: base64Audio
            }));

            // Update UI (simple voice activity detection)
            const volume = Math.max(...Array.from(inputData).map(Math.abs));
            if (volume > 0.01) {
                updateCandidateStatus('Speaking');
                document.getElementById('candidateCard').classList.add('speaking');
            } else {
                updateCandidateStatus('Listening');
                document.getElementById('candidateCard').classList.remove('speaking');
            }
        };

        // Connect the nodes
        source.connect(processor);
        processor.connect(audioCtx.destination);

        // Store for cleanup
        mediaRecorder = { audioCtx, source, processor, stream };

    } catch (error) {
        console.error('Failed to start audio capture:', error);
        alert('Failed to start audio capture: ' + error.message);
    }
}

/**
 * Resample audio buffer to 16kHz mono PCM16
 */
function resampleTo16kHz(audioBuffer) {
    const targetSampleRate = 16000;
    const sourceSampleRate = audioBuffer.sampleRate;
    const sourceData = audioBuffer.getChannelData(0); // Get mono channel

    const ratio = sourceSampleRate / targetSampleRate;
    const targetLength = Math.floor(sourceData.length / ratio);
    const resampledData = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
        const sourceIndex = Math.floor(i * ratio);
        resampledData[i] = sourceData[sourceIndex];
    }

    // Convert to PCM16
    return convertToPCM16(resampledData);
}

/**
 * Convert Float32Array to PCM16
 */
function convertToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Queue audio for playback
 */
function queueAudio(base64Audio) {
    audioQueue.push(base64Audio);
    if (!isPlaying) {
        playNextAudio();
    }
}

/**
 * Play next audio in queue
 */
async function playNextAudio() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        updateAIStatus('Ready');
        document.getElementById('aiCard').classList.remove('speaking');
        return;
    }

    isPlaying = true;
    document.getElementById('aiCard').classList.add('speaking');

    const base64Audio = audioQueue.shift();

    try {
        // Decode base64 to PCM
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert PCM to Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0;
        }

        // Create audio buffer
        const playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = playbackContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        // Play
        const source = playbackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackContext.destination);
        source.onended = () => {
            playNextAudio();
        };
        source.start(0);

    } catch (error) {
        console.error('Audio playback error:', error);
        playNextAudio();
    }
}

/**
 * Append text to transcript
 */
function appendToTranscript(speaker, text) {
    const transcriptContent = document.getElementById('transcriptContent');

    // Store in transcript array for analysis
    interviewTranscript.push({
        speaker,
        text,
        timestamp: Date.now()
    });

    if (speaker === 'ai' && currentTranscriptLine && currentTranscriptLine.speaker === 'ai') {
        // Append to existing AI line
        currentTranscriptLine.textEl.textContent += text;
        // Update last transcript entry
        interviewTranscript[interviewTranscript.length - 1].text = currentTranscriptLine.textEl.textContent;
    } else {
        // Create new line
        const line = document.createElement('div');
        line.className = 'transcript-line';

        const speakerEl = document.createElement('span');
        speakerEl.className = `speaker ${speaker}`;
        speakerEl.textContent = speaker === 'ai' ? 'AI Interviewer' : speaker === 'candidate' ? 'You' : 'System';

        const textEl = document.createElement('span');
        textEl.className = 'text';
        textEl.textContent = text;

        line.appendChild(speakerEl);
        line.appendChild(textEl);
        transcriptContent.appendChild(line);

        currentTranscriptLine = { speaker, textEl };

        // Auto-scroll
        transcriptContent.scrollTop = transcriptContent.scrollHeight;
    }
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected) {
    const statusPill = document.getElementById('connectionStatus');
    if (connected) {
        statusPill.classList.add('connected');
        statusPill.querySelector('span:last-child').textContent = 'Connected';
    } else {
        statusPill.classList.remove('connected');
        statusPill.querySelector('span:last-child').textContent = 'Disconnected';
    }
}

/**
 * Update AI status
 */
function updateAIStatus(status) {
    document.getElementById('aiStatus').textContent = status;
}

/**
 * Update candidate status
 */
function updateCandidateStatus(status) {
    document.getElementById('candidateStatus').textContent = status;
}

/**
 * Cleanup resources
 */
function cleanup() {
    // Stop microphone
    if (mediaRecorder) {
        if (mediaRecorder.processor) {
            mediaRecorder.processor.disconnect();
        }
        if (mediaRecorder.source) {
            mediaRecorder.source.disconnect();
        }
        if (mediaRecorder.audioCtx) {
            mediaRecorder.audioCtx.close();
        }
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        mediaRecorder = null;
    }

    // Close WebSocket
    if (ws) {
        ws.close();
        ws = null;
    }

    // Clear audio queue
    audioQueue = [];
    isPlaying = false;
    currentTranscriptLine = null;
}

/**
 * Show custom Danger Modal for termination
 */
function showTerminationModal(reason) {
    const modalHTML = `
    <div class="termination-overlay">
        <div class="termination-card">
            <div class="termination-icon">⚠️</div>
            <h2 class="termination-title">Interview Terminated</h2>
            <div class="termination-reason">Violation: ${reason}</div>
            <p class="termination-message">
                Your interview has been immediately terminated due to a violation of the <strong>Civil Services Code of Conduct</strong>.
                <br><br>
                Professionalism and integrity are non-negotiable standards for a UPSC aspirant.
            </p>
            <button class="btn-terminate" onclick="window.location.href='../pages/dashboard.html'">Return to Dashboard</button>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Play error sound if browser allows
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.error('Audio play failed', e);
    }
}
