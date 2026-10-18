const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const predictionRoutes = require('./routes/predictionRoutes');
const historyRoutes = require('./routes/historyRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health Route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Node.js API Gateway is running smoothly.' });
});

// Feature Routes
app.use('/api/v1/predict', predictionRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/chat', chatRoutes);
// app.use('/api/v1/auth', authRoutes);

// 404 handler (must come after all routes)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = app;