/**
 * Frontend Configuration
 * Centralized configuration for API and WebSocket URLs
 * Automatically detects environment (local vs production)
 */

const Config = {
    /**
     * Detect if running locally or in production
     */
    isLocal() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    },

    /**
     * Get the backend base URL
     * Update BACKEND_URL with your Render deployment URL after deployment
     */
    getBackendURL() {
        if (this.isLocal()) {
            return 'http://localhost:5000';
        }
        // TODO: Replace with your actual Render URL after deployment
        // Example: 'https://prepmind-backend.onrender.com'
        return process.env.BACKEND_URL || 'https://your-app-name.onrender.com';
    },

    /**
     * Get the WebSocket URL for interview feature
     * Automatically uses ws:// for local and wss:// for production
     */
    getWebSocketURL() {
        if (this.isLocal()) {
            return 'ws://localhost:5000/interview';
        }

        // Production: Use secure WebSocket (wss://)
        const backendURL = this.getBackendURL();
        const wsURL = backendURL.replace('https://', 'wss://');
        return `${wsURL}/interview`;
    },

    /**
     * Get the API base URL (for REST endpoints)
     */
    getAPIURL() {
        return `${this.getBackendURL()}/api`;
    },

    /**
     * Log current configuration (useful for debugging)
     */
    logConfig() {
        console.log('🔧 PrepMind AI Configuration:');
        console.log('  Environment:', this.isLocal() ? 'Local' : 'Production');
        console.log('  Backend URL:', this.getBackendURL());
        console.log('  WebSocket URL:', this.getWebSocketURL());
        console.log('  API URL:', this.getAPIURL());
    }
};

// Log configuration on load (can be disabled in production)
if (Config.isLocal()) {
    Config.logConfig();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
