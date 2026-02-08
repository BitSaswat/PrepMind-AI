/**
 * AI Routes - API endpoints for AI question generation and evaluation
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

/**
 * POST /api/ai/health
 * Check if AI module is healthy and dependencies are installed
 */
router.post('/ai/health', async (req, res) => {
    try {
        const health = await aiService.healthCheck();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'AI module health check failed',
            message: error.message,
            hint: 'Please ensure Python dependencies are installed: pip install -r requirements.txt'
        });
    }
});

/**
 * POST /api/ai/generate-questions
 * Generate questions based on configuration
 * 
 * Body:
 * {
 *   exam: "JEE" | "NEET",
 *   subject_data: {
 *     "Physics": { chapters: [...], num_questions: 30, difficulty: "Medium" },
 *     "Chemistry": { chapters: [...], num_questions: 30, difficulty: "Medium" }
 *   }
 * }
 */
router.post('/ai/generate-questions', async (req, res) => {
    try {
        const { exam, subject_data } = req.body;

        // Validation
        if (!exam || !subject_data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: exam and subject_data'
            });
        }

        // Validate exam type
        if (!['JEE', 'NEET', 'UPSC', 'CSAT'].includes(exam)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid exam type. Must be JEE, NEET, UPSC, or CSAT'
            });
        }

        // Generate questions
        const result = await aiService.generateQuestions({
            exam,
            subject_data
        });

        res.json(result);

    } catch (error) {
        console.error('[AI Routes] Question generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate questions',
            message: error.message
        });
    }
});

/**
 * POST /api/ai/generate-pdf
 * Generate PDF from questions
 * 
 * Body:
 * {
 *   questions_by_subject: { "Physics": [...], "Chemistry": [...] },
 *   title: "JEE Mock Test",
 *   with_solutions: true | false
 * }
 */
router.post('/ai/generate-pdf', async (req, res) => {
    try {
        const { questions_by_subject, title, with_solutions } = req.body;

        // Validation
        if (!questions_by_subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: questions_by_subject'
            });
        }

        // Generate PDF
        const pdfBuffer = await aiService.generatePDF(
            questions_by_subject,
            title || 'Mock Test',
            with_solutions || false
        );

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'Mock_Test'}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('[AI Routes] PDF generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            message: error.message
        });
    }
});

/**
 * POST /api/ai/evaluate
 * Evaluate test answers
 * 
 * Body:
 * {
 *   questions: [...],
 *   user_answers: { "0": "A", "1": "B", ... },
 *   exam: "JEE" | "NEET"
 * }
 */
router.post('/ai/evaluate', async (req, res) => {
    try {
        const { questions, user_answers, exam } = req.body;

        // Validation
        if (!questions || !user_answers) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: questions and user_answers'
            });
        }

        // Evaluate
        const result = await aiService.evaluateTest(
            questions,
            user_answers,
            exam || 'JEE'
        );

        res.json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('[AI Routes] Evaluation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to evaluate test',
            message: error.message
        });
    }
});

module.exports = router;
