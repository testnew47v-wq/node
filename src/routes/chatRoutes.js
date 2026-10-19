const express = require('express');
const axios = require('axios');
const { mapAiEngineError } = require('../utils/aiEngineError');
const router = express.Router();

// Free-tier AI engine hosting can take 60-90 seconds to wake up from sleep.
const AI_ENGINE_TIMEOUT_MS = 100000;
const WAKING_STATUSES = [502, 503, 504];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/ask', async (req, res) => {
    const { query } = req.body || {};

    if (!query || !String(query).trim()) {
        return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const AI_ENGINE_URL = (process.env.AI_ENGINE_URL || 'https://neonutricarefastapi-1.onrender.com').replace(/\/+$/, '');
    const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neonutricare_secret_dev_key_2026';

    const url = `${AI_ENGINE_URL}/api/v1/chat/ask`;
    const body = { query: String(query).trim() };
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': INTERNAL_API_KEY
        },
        timeout: AI_ENGINE_TIMEOUT_MS
    };

    try {
        let response;
        try {
            response = await axios.post(url, body, options);
        } catch (error) {
            const status = error.response && error.response.status;
            if (WAKING_STATUSES.includes(status)) {
                console.warn(`[Chat] AI engine returned ${status}, retrying once...`);
                await sleep(4000);
                response = await axios.post(url, body, options);
            } else {
                throw error;
            }
        }

        // FastAPI ka result wapas Flutter ko bhejna
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Chat API error:', error.message,
            error.response ? JSON.stringify(error.response.data) : '');
        const { status, message } = mapAiEngineError(error, 'Chat');
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
