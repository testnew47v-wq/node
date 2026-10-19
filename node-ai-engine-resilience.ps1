# ============================================================
# Node gateway: 100s timeout to the AI engine, clear 503 message
# while it wakes up, and real errors in the Vercel logs.
# Run this INSIDE D:\neonutricare\api-gateway-node
# ============================================================

New-Item -ItemType Directory -Force -Path "src/utils" | Out-Null
Write-Host "Updating src/utils/aiEngineError.js" -ForegroundColor Cyan
$content = @'
/**
 * utils/aiEngineError.js
 * Turns an axios error from a call to the FastAPI AI Engine into a clean
 * { status, message } pair for the Flutter client, and logs the REAL cause
 * so it shows up in the Vercel runtime logs.
 *
 * Use it in any controller that talks to FastAPI (predict, chat, ...):
 *   const { status, message } = mapAiEngineError(error, 'Chat Controller');
 *   return res.status(status).json({ success: false, message });
 */
function mapAiEngineError(error, context = 'AI Engine') {
    // FastAPI answered, but with an error status.
    if (error.response) {
        const data = error.response.data || {};
        console.error(`[${context}] FastAPI responded ${error.response.status}:`, JSON.stringify(data));

        let message = 'The AI engine returned an error.';
        if (data.message) {
            message = data.message;
        } else if (typeof data.detail === 'string') {
            message = data.detail;
        } else if (Array.isArray(data.detail)) {
            message = 'Invalid input was sent to the AI engine.';
        }
        return { status: error.response.status, message };
    }

    // No response at all: timeout, DNS failure, connection refused/reset.
    console.error(`[${context}] No response from FastAPI:`, error.code, error.message);
    const unreachable = ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    if (unreachable.includes(error.code)) {
        return {
            status: 503,
            message: 'The AI engine is starting up. Please try again in about a minute.',
        };
    }

    // Anything else is a bug on our side (for example an invalid URL
    // because an environment variable is missing).
    return { status: 500, message: 'Internal server error while contacting the AI engine.' };
}

module.exports = { mapAiEngineError };

'@
Set-Content -Path "src/utils/aiEngineError.js" -Value $content -NoNewline -Encoding UTF8

New-Item -ItemType Directory -Force -Path "src/controllers" | Out-Null
Write-Host "Updating src/controllers/predictionController.js" -ForegroundColor Cyan
$content = @'
const axios = require('axios');
const PredictionRecord = require('../models/PredictionRecord');
const { mapAiEngineError } = require('../utils/aiEngineError');

// Free-tier AI engine hosting can take 60-90 seconds to wake up from sleep.
const AI_ENGINE_TIMEOUT_MS = 100000;

exports.predictMalnutritionRisk = async (req, res) => {
    const payload = req.body;
    const userId = req.user.uid; // from the verified Firebase token

    if (!process.env.AI_ENGINE_URL || !process.env.INTERNAL_API_KEY) {
        console.error('[Prediction Controller] AI_ENGINE_URL or INTERNAL_API_KEY is not set on this deployment.');
        return res.status(500).json({
            success: false,
            message: 'Server is not configured to reach the AI engine.'
        });
    }

    // 1. Ask the FastAPI engine for a prediction
    let aiResult;
    try {
        const response = await axios.post(
            `${process.env.AI_ENGINE_URL}/api/v1/predict`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY
                },
                timeout: AI_ENGINE_TIMEOUT_MS
            }
        );
        aiResult = response.data;
    } catch (error) {
        const { status, message } = mapAiEngineError(error, 'Prediction Controller');
        return res.status(status).json({ success: false, message });
    }

    const { prediction_code, status, confidence_score } = aiResult;

    // 2. Save the record in MongoDB
    let newRecord;
    try {
        newRecord = await PredictionRecord.create({
            userId,
            inputData: payload,
            predictionCode: prediction_code,
            status,
            confidenceScore: confidence_score
        });
    } catch (dbError) {
        console.error('[Prediction Controller] Could not save record:', dbError.message);
        return res.status(500).json({
            success: false,
            message: 'The prediction was made but could not be saved. Please try again.'
        });
    }

    // 3. Respond to Flutter
    return res.status(200).json({
        success: true,
        data: {
            recordId: newRecord._id,
            predictionCode: prediction_code,
            status,
            confidenceScore: confidence_score
        }
    });
};

'@
Set-Content -Path "src/controllers/predictionController.js" -Value $content -NoNewline -Encoding UTF8

Write-Host ''
Write-Host 'Done. Now deploy it to Vercel:' -ForegroundColor Green
Write-Host '  git add .' -ForegroundColor Yellow
Write-Host '  git commit -m "Harden AI engine calls"' -ForegroundColor Yellow
Write-Host '  git push' -ForegroundColor Yellow