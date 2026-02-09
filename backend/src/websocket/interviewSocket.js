/**
 * WebSocket Interview Server
 * Handles real-time audio streaming for UPSC AI interviews
 */

const WebSocket = require('ws');
const { GoogleGenAI, Modality } = require('@google/genai');

class InterviewSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server, path: '/interview' });
        this.clients = new Set();
        this.sessions = new Map(); // userId -> session data

        this.initialize();
    }

    initialize() {
        console.log('🎤 Interview WebSocket Server initialized at /interview');

        this.wss.on('connection', (socket, request) => {
            console.log('📞 New interview client connected');
            this.clients.add(socket);

            this.setupSocketHandlers(socket);
        });
    }

    setupSocketHandlers(socket) {
        let geminiSession = null;
        let isConnectedToGemini = false;

        socket.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case 'startInterview':
                        await this.handleStartInterview(socket, message, (session) => {
                            geminiSession = session;
                            isConnectedToGemini = true;
                        });
                        break;

                    case 'realtimeInput':
                        if (geminiSession && isConnectedToGemini) {
                            await this.handleAudioInput(geminiSession, message);
                        }
                        break;

                    case 'endInterview':
                        if (geminiSession) {
                            await this.handleEndInterview(geminiSession);
                            geminiSession = null;
                            isConnectedToGemini = false;
                        }
                        break;
                }
            } catch (error) {
                console.error('Error handling message:', error);
                this.sendError(socket, error.message);
            }
        });

        socket.on('close', () => {
            console.log('📴 Interview client disconnected');
            this.clients.delete(socket);

            // Cleanup Gemini session if exists
            if (geminiSession && typeof geminiSession.close === 'function') {
                try {
                    geminiSession.close();
                } catch (error) {
                    console.error('Error closing Gemini session:', error);
                }
            }
        });

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(socket);
        });
    }

    async handleStartInterview(socket, message, setGeminiSession) {
        const { interviewTarget } = message;

        if (!interviewTarget) {
            this.sendError(socket, 'Interview target is required');
            return;
        }

        console.log(`🎯 Starting UPSC interview for: ${interviewTarget}`);

        try {
            // Initialize Gemini Live API with Vertex AI
            const projectId = process.env.GOOGLE_CLOUD_PROJECT;
            if (!projectId) {
                throw new Error('GOOGLE_CLOUD_PROJECT not configured');
            }

            console.log(`🔑 Using Google Cloud Project: ${projectId}`);

            const ai = new GoogleGenAI({
                vertexai: {
                    project: projectId,
                    location: 'us-central1' // or your preferred region
                }
            });

            // UPSC-specific system prompt
            const systemPrompt = this.getUPSCSystemPrompt();

            const config = {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {}, // Enable input transcription for content moderation
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Charon' // Using 'Charon' (Deep, Authoritative) for strict UPSC interviewer persona.
                        }
                    }
                },
                systemInstruction: systemPrompt,
                tools: [{
                    googleSearch: {}
                }],
                // Turn-taking configuration - wait for silence before responding
                turnConfig: {
                    silenceDurationMs: 2000, // Wait 2 seconds of silence
                    endOfTurnDetection: 'auto'
                }
            };

            console.log('🔌 Connecting to Gemini Live API via Vertex AI...');

            const session = await ai.live.connect({
                model: 'gemini-live-2.5-flash',
                config,
                callbacks: {
                    onopen: () => {
                        console.log('✅ Gemini Live Session Opened');
                        this.sendMessage(socket, { type: 'connected', data: 'AI Interviewer Ready' });
                    },

                    onmessage: (msg) => {
                        this.handleGeminiMessage(socket, msg);
                    },

                    onerror: (error) => {
                        console.error('❌ Gemini Error:', error);
                        this.sendError(socket, 'AI Interviewer error');
                    },

                    onclose: (event) => {
                        console.log('⚠️ Gemini Session Closed');
                        console.log('Close event details:', {
                            code: event?.code,
                            reason: event?.reason,
                            wasClean: event?.wasClean
                        });
                    }
                }
            });

            setGeminiSession(session);

            // Send initial prompt to start interview
            try {
                console.log('📤 Sending initial prompt to Gemini...');
                await session.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: [{
                            text: `Interview target: ${interviewTarget}. The candidate is appearing for UPSC Civil Services Interview (Personality Test). Begin with a professional welcome and ask the first question about their background or motivation for civil services.`
                        }]
                    }],
                    turnComplete: true
                });
                console.log('✅ Initial prompt sent successfully');
            } catch (promptError) {
                console.error('❌ Error sending initial prompt:', promptError);
                throw promptError;
            }

        } catch (error) {
            console.error('Error starting interview:', error);
            this.sendError(socket, `Failed to start interview: ${error.message}`);
        }
    }

    handleGeminiMessage(socket, message) {
        console.log('📨 Gemini message received:', JSON.stringify(message, null, 2).substring(0, 500));

        // Handle input transcription (candidate's speech) for content moderation
        if (message.serverContent?.inputTranscription) {
            const candidateText = message.serverContent.inputTranscription.text;

            if (candidateText) {
                console.log('🎤 Candidate said:', candidateText);

                // Check for inappropriate content
                if (this.containsInappropriateContent(candidateText)) {
                    console.warn('⚠️ Inappropriate content detected, terminating interview');
                    this.sendMessage(socket, {
                        type: 'terminateForViolation',
                        reason: 'Use of inappropriate language'
                    });
                    return;
                }
            }
        }

        // Handle audio output transcription
        if (message.serverContent?.outputTranscription) {
            const transcription = message.serverContent.outputTranscription.text;
            console.log('📝 Transcription:', transcription);
            this.sendMessage(socket, {
                type: 'textStream',
                data: transcription
            });
        }

        // Handle audio data
        if (message.serverContent?.modelTurn?.parts) {
            message.serverContent.modelTurn.parts.forEach((part) => {
                if (part.inlineData?.data) {
                    console.log('🔊 Sending audio chunk to client');
                    this.sendMessage(socket, {
                        type: 'audioStream',
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType
                    });
                }
            });
        }
    }

    /**
     * Check if text contains inappropriate content
     */
    containsInappropriateContent(text) {
        const lowerText = text.toLowerCase();

        // List of inappropriate words (basic filter + user reported triggers)
        const inappropriateWords = [
            'fuck', 'shit', 'damn', 'hell', 'bitch', 'bastard', 'asshole',
            'crap', 'piss', 'dick', 'cock', 'pussy', 'whore', 'slut',
            'kill', 'die', 'suicide', 'threat', 'idiot', 'stupid', 'nonsense',
            'bribe', 'money', 'cash', 'pay', 'setting', 'offer', 'corruption'
        ];

        return inappropriateWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lowerText);
        });
    }

    async handleAudioInput(session, message) {
        const audioData = message.data || message.audioData; // Support both field names

        if (!audioData) {
            console.warn('⚠️ No audio data received');
            return;
        }

        try {
            // Log only occasionally to reduce spam
            if (!this.audioChunkCounter) this.audioChunkCounter = 0;
            this.audioChunkCounter++;

            if (this.audioChunkCounter % 20 === 0) {
                console.log(`🎤 Sending audio to Gemini (${audioData.length} bytes, chunk #${this.audioChunkCounter})`);
            }

            await session.sendRealtimeInput({
                media: {
                    data: audioData,
                    mimeType: 'audio/pcm;rate=16000'
                }
            });
        } catch (error) {
            console.error('Error sending audio to Gemini:', error);
        }
    }

    async handleEndInterview(session) {
        try {
            console.log('🛑 Ending interview session');
            if (session && typeof session.close === 'function') {
                session.close();
            }
        } catch (error) {
            console.error('Error closing session:', error);
        }
    }

    getUPSCSystemPrompt() {
        return [
            'You are a senior member of the UPSC Interview Board conducting the Personality Test for Civil Services.',
            'This is the FINAL and MOST CRITICAL stage. Only the best candidates succeed here.',
            'Your role is to RIGOROUSLY TEST the candidate\'s suitability for civil services.',
            '',
            'Language and Tone:',
            '- Use Indian English professionally (e.g., "kindly elaborate", "your good self", "as per")',
            '- Maintain STRICT, formal, and highly evaluative tone',
            '- Be polite but DEMANDING - do not accept vague or superficial answers',
            '- Challenge every weak response immediately',
            '- Show subtle disapproval for poor answers through tone',
            '',
            'Interview Conduct (STRICT):',
            '- Ask TOUGH, multi-layered questions that test DEPTH of understanding',
            '- NEVER accept generic or textbook answers - probe deeper',
            '- Ask "Why?", "How?", "What if?" to test critical thinking',
            '- Challenge assumptions and ask for SPECIFIC examples',
            '- If answer is vague, say "That is too general. Please be specific."',
            '- If answer is wrong, politely correct and ask a tougher follow-up',
            '- Test consistency - refer back to previous answers',
            '- Ask cross-domain questions linking multiple subjects',
            '- Expect candidates to know CURRENT affairs in detail',
            '',
            'Question Style (UPSC Level):',
            '- Start with background, then RAPIDLY increase difficulty',
            '- Ask about RECENT events (last 6 months) and their implications',
            '- Pose ethical dilemmas with NO clear right answer',
            '- Ask "As a District Magistrate, what would YOU do if..." scenarios',
            '- Question their optional subject knowledge in depth',
            '- Ask about CONTROVERSIAL topics to test balanced thinking',
            '- Test knowledge of Indian Constitution, governance, and policies',
            '',
            'Topics (Rotate and Interconnect):',
            '1. Current Affairs - Recent government policies, international events',
            '2. Polity - Constitutional amendments, landmark judgments, federalism issues',
            '3. Economy - Budget provisions, inflation, employment, rural economy',
            '4. Society - Caste, gender justice, education reforms, health',
            '5. Ethics - Real administrative dilemmas, integrity vs pragmatism',
            '6. Geography - Climate change, disasters, water crisis, urbanization',
            '7. Science & Tech - Digital India, AI, space, defense technology',
            '8. International Relations - Border issues, strategic partnerships, trade',
            '9. Environment - Sustainability, pollution, renewable energy',
            '10. Governance - Bureaucratic reforms, transparency, accountability',
            '',
            'Evaluation Standards (HIGH):',
            '- Expect DEPTH, not breadth - one topic explored thoroughly',
            '- Demand SPECIFIC examples, data, and case studies',
            '- Test ANALYTICAL ability - not just factual recall',
            '- Assess COMMUNICATION - clarity, confidence, humility',
            '- Check EMOTIONAL INTELLIGENCE - empathy, stress handling',
            '- Evaluate ETHICS - integrity, values, decision-making',
            '',
            'Indian Context (MANDATORY):',
            '- Reference Indian schemes: PM-KISAN, Ayushman Bharat, Swachh Bharat, MGNREGA',
            '- Discuss Indian leaders: Ambedkar, Patel, Nehru, current ministers',
            '- Ask about state-specific issues if candidate mentions home state',
            '- Use administrative terms: DM, SP, BDO, Panchayat, Collector',
            '- Refer to recent Supreme Court judgments and government policies',
            '',
            'Response Style:',
            '- Keep YOUR responses BRIEF and POINTED',
            '- Do NOT give long explanations - this is THEIR test',
            '- Ask ONE sharp question at a time',
            '- Show approval RARELY - only for exceptional answers',
            '- Maintain professional distance - you are evaluating, not teaching',
            '',
            'CRITICAL: If candidate uses ANY inappropriate language, profanity, or shows disrespect, ',
            'the interview will be IMMEDIATELY TERMINATED by the system. Professionalism is NON-NEGOTIABLE.'
        ].join(' ');
    }

    sendMessage(socket, message) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    sendError(socket, errorMessage) {
        this.sendMessage(socket, {
            type: 'error',
            message: errorMessage
        });
    }

    close() {
        this.wss.close();
        console.log('Interview WebSocket Server closed');
    }
}

module.exports = InterviewSocketServer;
