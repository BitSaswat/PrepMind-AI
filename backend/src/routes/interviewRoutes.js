const express = require('express');
const InterviewController = require('../controllers/interviewController');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const router = express.Router();

// Initialize Google Gen AI (same as interview socket)
const client = new GoogleGenAI({
    vertexai: {
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: 'us-central1'
    }
});

// Interview endpoints
router.post('/interview/session', InterviewController.createSession);
router.get('/interview/history/:userId', InterviewController.getHistory);

// Analyze interview performance
router.post('/analyze-interview', async (req, res) => {
    try {
        const { transcript, duration } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        const prompt = `You are an expert UPSC interview evaluator. Analyze the following interview transcript and provide a detailed performance analysis in JSON format.

Interview Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds

Transcript:
${transcript}

Return valid JSON with this structure:
{
  "communication_score": 0-250,
  "communication_feedback": "string",
  "knowledge_score": 0-250,
  "knowledge_feedback": "string",
  "critical_thinking_score": 0-250,
  "critical_thinking_feedback": "string",
  "professionalism_score": 0-250,
  "professionalism_feedback": "string",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string"],
  "overall_summary": "string"
}

Scoring Criteria (UPSC Standard):
- Communication: Clarity, articulation, confidence.
- Knowledge: Accuracy, depth, relevance.
- Critical Thinking: Reasoning, distinct perspective, problem-solving.
- Professionalism: Demeanor, language, composure.

CRITICAL INSTRUCTION: MARK VERY STRICTLY.
- The maximum score for each category is 250.
- A score of 125/250 is considered AVERAGE.
- A score of 175/250 is GOOD.
- A score of 200+/250 is EXCEPTIONAL and rare.
- If the transcript is very short or the candidate failed to answer, give VERY LOW scores (e.g., 20-50/250).`;

        console.log('Generating analysis with gemini-2.0-flash-001...');

        // Use gemini-2.0-flash-001 which is explicitly listed in available models
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        console.log('Gemini Analysis Response:', JSON.stringify(response, null, 2));

        // Handle response implementation differences
        // @google/genai v0.1.0+ often returns the response object directly
        const candidates = response.candidates || (response.response && response.response.candidates);

        if (!candidates || candidates.length === 0) {
            throw new Error('No analysis generated from Gemini');
        }

        const rawText = candidates[0].content.parts[0].text;

        // Ensure we send an object, not a string
        let analysisData;
        try {
            // Clean up markdown code blocks if present
            const jsonString = rawText.replace(/```json\n?|\n?```/g, '').trim();
            analysisData = JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', e);
            // Fallback if model returns bad JSON
            analysisData = { overall_summary: rawText };
        }

        res.json({ analysis: analysisData });

    } catch (error) {
        console.error('Error analyzing interview:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

module.exports = router;
