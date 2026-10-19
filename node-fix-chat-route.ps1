# ============================================================
# Fix chat 500: use AI_ENGINE_URL (not FASTAPI_URL), remove the
# hardcoded secret fallback, require login, add timeout + clear errors.
# Run this INSIDE D:\neonutricare\api-gateway-node
# ============================================================

Write-Host "Updating src/routes/chatRoutes.js" -ForegroundColor Cyan
$content = @'
// api-gateway-node/src/routes/chatRoutes.js
const express = require('express');
const axios = require('axios');
const verifyFirebaseToken = require('../middlewares/auth');
const { mapAiEngineError } = require('../utils/aiEngineError');

const router = express.Router();

// The RAG answer takes ~10s normally; allow extra time for a cold start
// of the (free-tier) AI engine.
const AI_ENGINE_TIMEOUT_MS = 100000;

// Protected: only logged-in users can spend the Gemini quota.
router.post('/ask', verifyFirebaseToken, async (req, res) => {
    const { query } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ success: false, message: 'Query is required' });
    }

    // Same variables as the prediction controller. No hardcoded fallbacks:
    // a missing variable must fail loudly instead of calling localhost.
    if (!process.env.AI_ENGINE_URL || !process.env.INTERNAL_API_KEY) {
        console.error('[Chat] AI_ENGINE_URL or INTERNAL_API_KEY is not set on this deployment.');
        return res.status(500).json({
            success: false,
            message: 'Server is not configured to reach the AI engine.'
        });
    }

    try {
        const response = await axios.post(
            `${process.env.AI_ENGINE_URL}/api/v1/chat/ask`,
            { query: query.trim() },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY
                },
                timeout: AI_ENGINE_TIMEOUT_MS
            }
        );

        // Pass the FastAPI result (answer + sources) straight to Flutter.
        return res.status(200).json(response.data);
    } catch (error) {
        const { status, message } = mapAiEngineError(error, 'Chat');
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;

'@
Set-Content -Path "src/routes/chatRoutes.js" -Value $content -NoNewline -Encoding UTF8

Write-Host ''
Write-Host 'Done. Deploy it to Vercel:' -ForegroundColor Green
Write-Host '  git add .' -ForegroundColor Yellow
Write-Host '  git commit -m "Fix chat route env var and add auth"' -ForegroundColor Yellow
Write-Host '  git push' -ForegroundColor Yellow