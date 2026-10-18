// api-gateway-node/src/routes/chatRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// FastAPI URL (Environment variable se ya direct)
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neonutricare-secret-key-123';

router.post('/ask', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, message: 'Query is required' });
        }

        // FastAPI ko request bhejna
        const response = await axios.post(
            `${FASTAPI_URL}/api/v1/chat/ask`,
            { query: query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': INTERNAL_API_KEY
                }
            }
        );

        // FastAPI ka result wapas Flutter ko bhejna
        res.status(200).json(response.data);

    } catch (error) {
        console.error("Chat API error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to connect to AI Assistant.",
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;