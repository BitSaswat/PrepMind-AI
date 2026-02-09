const http = require('http');
const app = require('./src/app');
const InterviewSocketServer = require('./src/websocket/interviewSocket');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Create HTTP server
const server = http.createServer(app);

// Initialize Interview WebSocket Server
const interviewSocket = new InterviewSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 PrepMind AI Backend Server Started');
  console.log('=====================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🎤 Interview WebSocket: ${isProduction ? 'wss' : 'ws'}://localhost:${PORT}/interview`);
  console.log(`💊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🏓 Ping Endpoint: http://localhost:${PORT}/ping`);

  if (isProduction) {
    console.log('🔥 Production mode - CORS enabled for Vercel');
    console.log('⏰ Keep-alive pinger should hit /ping every 10 minutes');
  } else {
    console.log('🛠️  Development mode - All origins allowed');
  }

  console.log('=====================================\n');
});