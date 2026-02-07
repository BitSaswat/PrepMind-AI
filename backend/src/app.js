const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', authRoutes);
app.use('/api', aiRoutes);

module.exports = app;
