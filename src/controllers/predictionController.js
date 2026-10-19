const axios = require('axios');
const PredictionRecord = require('../models/PredictionRecord');
const { mapAiEngineError } = require('../utils/aiEngineError');

// Free-tier AI engine hosting can take 60-90 seconds to wake up from sleep.
const AI_ENGINE_TIMEOUT_MS = 100000;
// Render's proxy answers with these while the service is waking up.
const WAKING_STATUSES = [502, 503, 504];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST to the AI engine, retrying once if Render is still waking up. */
const callAiEngine = async (url, payload, headers) => {
    const options = { headers, timeout: AI_ENGINE_TIMEOUT_MS };
    try {
        return await axios.post(url, payload, options);
    } catch (error) {
        const status = error.response && error.response.status;
        if (WAKING_STATUSES.includes(status)) {
            console.warn(`[Prediction Controller] AI engine returned ${status}, retrying once...`);
            await sleep(4000);
            return axios.post(url, payload, options);
        }
        throw error;
    }
};

exports.predictMalnutritionRisk = async (req, res) => {
    // Never trust a userId coming from the body for the AI call; keep it out of the payload.
    const { userId: bodyUserId, ...payload } = req.body || {};

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'Prediction data is required.' });
    }

    // req.user is set only when an auth middleware is attached to the route.
    // Until then we fall back so the endpoint does not crash.
    const userId = (req.user && req.user.uid) || bodyUserId || 'anonymous';

    const AI_ENGINE_URL = (process.env.AI_ENGINE_URL || 'https://neonutricarefastapi-1.onrender.com').replace(/\/+$/, '');
    const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neonutricare_secret_dev_key_2026';

    // 1. Ask the FastAPI engine for a prediction
    let aiResult;
    try {
        const response = await callAiEngine(
            `${AI_ENGINE_URL}/api/v1/predict`,
            payload,
            {
                'Content-Type': 'application/json',
                'X-Internal-Api-Key': INTERNAL_API_KEY
            }
        );
        aiResult = response.data;
    } catch (error) {
        console.error('[Prediction Controller] AI engine error:', error.message,
            error.response ? JSON.stringify(error.response.data) : '');
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
