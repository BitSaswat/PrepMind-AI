/**
 * AI Service - Node.js bridge to Python AI generation module
 * 
 * This service spawns Python processes to call the AI generation module
 * and handles communication via JSON over stdin/stdout.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AIService {
    constructor() {
        this.pythonPath = path.join(__dirname, '../../venv/bin/python3');
        this.aiGenPath = path.join(__dirname, '../../ai_gen');
        this.cliPath = path.join(this.aiGenPath, 'cli.py');
    }

    /**
     * Execute Python CLI command and return parsed JSON result
     * @param {string} command - CLI command (e.g., 'generate-questions')
     * @param {Object} data - Data to send to Python via stdin
     * @param {number} timeout - Timeout in milliseconds (default: 60000)
     * @returns {Promise<Object>} - Parsed JSON response
     */
    async executePythonCommand(command, data = null, timeout = 60000) {
        return new Promise((resolve, reject) => {
            const args = ['-m', 'ai_gen.cli', command];

            console.log(`[AIService] Executing: ${this.pythonPath} ${args.join(' ')}`);

            const pythonProcess = spawn(this.pythonPath, args, {
                cwd: path.join(__dirname, '../..'),
                env: { ...process.env }
            });

            let stdout = '';
            let stderr = '';
            let timeoutId;

            // Set timeout
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    pythonProcess.kill();
                    reject(new Error(`Python process timed out after ${timeout}ms`));
                }, timeout);
            }

            // Collect stdout
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            // Collect stderr
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error(`[AIService] Python stderr: ${data.toString()}`);
            });

            // Handle process completion
            pythonProcess.on('close', (code) => {
                if (timeoutId) clearTimeout(timeoutId);

                if (code !== 0) {
                    console.error(`[AIService] Python process exited with code ${code}`);
                    console.error(`[AIService] stderr: ${stderr}`);
                    reject(new Error(`Python process failed: ${stderr || 'Unknown error'}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);

                    if (!result.success) {
                        reject(new Error(result.error || 'Unknown error from Python module'));
                        return;
                    }

                    resolve(result);
                } catch (error) {
                    console.error(`[AIService] Failed to parse JSON: ${stdout}`);
                    reject(new Error(`Failed to parse Python output: ${error.message}`));
                }
            });

            // Handle process errors
            pythonProcess.on('error', (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                reject(new Error(`Failed to spawn Python process: ${error.message}`));
            });

            // Send data to stdin if provided
            if (data) {
                pythonProcess.stdin.write(JSON.stringify(data));
                pythonProcess.stdin.end();
            }
        });
    }

    /**
     * Generate questions based on configuration
     * @param {Object} config - Question generation configuration
     * @returns {Promise<Object>} - Generated questions and metadata
     */
    async generateQuestions(config) {
        console.log('[AIService] Generating questions:', JSON.stringify(config, null, 2));

        try {
            const result = await this.executePythonCommand('generate-questions', config, 300000); // 5 min timeout

            console.log(`[AIService] Generated ${result.metadata.total_questions} questions`);

            return {
                success: true,
                questions: result.questions,
                by_subject: result.by_subject,
                metadata: result.metadata
            };
        } catch (error) {
            console.error('[AIService] Question generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate PDF from questions
     * @param {Object} questionsData - Questions grouped by subject
     * @param {string} title - PDF title
     * @param {boolean} withSolutions - Include solutions in PDF
     * @returns {Promise<Buffer>} - PDF buffer
     */
    async generatePDF(questionsData, title = 'Mock Test', withSolutions = false) {
        console.log(`[AIService] Generating PDF: ${title} (solutions: ${withSolutions})`);

        try {
            const data = {
                questions_by_subject: questionsData,
                title: title,
                with_solutions: withSolutions
            };

            const result = await this.executePythonCommand('generate-pdf', data, 60000);

            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(result.pdf, 'base64');

            console.log(`[AIService] PDF generated: ${pdfBuffer.length} bytes`);

            return pdfBuffer;
        } catch (error) {
            console.error('[AIService] PDF generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Evaluate test answers
     * @param {Array} questions - Array of question objects
     * @param {Object} userAnswers - User's answers {questionId: answer}
     * @param {string} exam - Exam type (JEE/NEET)
     * @returns {Promise<Object>} - Evaluation results
     */
    async evaluateTest(questions, userAnswers, exam = 'JEE') {
        console.log(`[AIService] Evaluating ${questions.length} questions for ${exam}`);

        try {
            const data = {
                questions: questions,
                user_answers: userAnswers,
                exam: exam
            };

            const result = await this.executePythonCommand('evaluate', data, 30000);

            console.log(`[AIService] Evaluation complete: ${result.result.total_marks} marks`);

            return result.result;
        } catch (error) {
            console.error('[AIService] Evaluation failed:', error.message);
            throw error;
        }
    }

    /**
     * Health check to verify Python module is working
     * @returns {Promise<Object>} - Health status
     */
    async healthCheck() {
        try {
            const result = await this.executePythonCommand('health-check', null, 10000);
            return result;
        } catch (error) {
            console.error('[AIService] Health check failed:', error.message);
            throw error;
        }
    }

    /**
     * Check if Python dependencies are installed
     * @returns {Promise<boolean>} - True if dependencies are installed
     */
    async checkDependencies() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            if (error.message.includes('No module named')) {
                return false;
            }
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new AIService();
