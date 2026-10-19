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
