# ============================================================
# Phase 3 wiring fix: mount predictionRoutes + activate connectDB
# Run this INSIDE D:\neonutricare\api-gateway-node
# ============================================================

Write-Host "Updating src/app.js" -ForegroundColor Cyan
$content = @'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const predictionRoutes = require('./routes/predictionRoutes');

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
// app.use('/api/v1/auth', authRoutes);

// 404 handler (must come after all routes)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = app;
'@
Set-Content -Path "src/app.js" -Value $content -NoNewline -Encoding UTF8

Write-Host "Updating src/server.js" -ForegroundColor Cyan
$content = @'
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`[NeoNutriCare] API Gateway listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
'@
Set-Content -Path "src/server.js" -Value $content -NoNewline -Encoding UTF8

Write-Host ""
Write-Host "Wiring complete. Restart the dev server (nodemon will auto-reload)." -ForegroundColor Green
Write-Host "Test with:  curl.exe -X POST http://localhost:5000/api/v1/predict -H \"Content-Type: application/json\" -d '{}'" -ForegroundColor Yellow
