const http = require('http');
const app = require('./src/app');
const InterviewSocketServer = require('./src/websocket/interviewSocket');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Interview WebSocket Server
const interviewSocket = new InterviewSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎤 Interview WebSocket available at ws://localhost:${PORT}/interview`);
});