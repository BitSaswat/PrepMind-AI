/**
 * Interview Controller
 * Handles HTTP requests for interview sessions
 */

const InterviewService = require('../services/interviewService');

class InterviewController {
    /**
     * Create a new interview session (placeholder for future use)
     * POST /api/interview/session
     */
    static async createSession(req, res) {
        try {
            const { userId, interviewTarget } = req.body;

            if (!userId || !interviewTarget) {
                return res.status(400).json({
                    success: false,
                    error: 'userId and interviewTarget are required'
                });
            }

            // For now, sessions are managed via WebSocket
            // This endpoint can be used to store session metadata
            res.json({
                success: true,
                message: 'Connect to WebSocket at /interview to start interview',
                websocketUrl: '/interview'
            });

        } catch (error) {
            console.error('Error creating interview session:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get interview history (placeholder for future use)
     * GET /api/interview/history/:userId
     */
    static async getHistory(req, res) {
        try {
            const { userId } = req.params;

            // TODO: Implement interview history retrieval from database
            res.json({
                success: true,
                history: []
            });

        } catch (error) {
            console.error('Error fetching interview history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = InterviewController;
