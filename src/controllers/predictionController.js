const axios = require('axios');
const PredictionRecord = require('../models/PredictionRecord');

exports.predictMalnutritionRisk = async (req, res) => {
    try {
        const payload = req.body;
        // In a real scenario, you'd extract userId from the verified Firebase token:
        // const userId = req.user.uid; 
        const userId = "test_user_id"; // Placeholder for now

        // 1. Forward data to FastAPI Engine
        const fastApiResponse = await axios.post(
            `${process.env.AI_ENGINE_URL}/api/v1/predict`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY
                }
            }
        );

        const { prediction_code, status, confidence_score } = fastApiResponse.data;

        // 2. Save record in MongoDB
        const newRecord = await PredictionRecord.create({
            userId,
            inputData: payload,
            predictionCode: prediction_code,
            status,
            confidenceScore: confidence_score
        });

        // 3. Send final response back to Flutter
        res.status(200).json({
            success: true,
            data: {
                recordId: newRecord._id,
                predictionCode: prediction_code,
                status,
                confidenceScore: confidence_score
            }
        });

    } catch (error) {
        console.error("[Prediction Controller] Error:", error.message);
        
        // Handle Axios errors (FastAPI returned an error)
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || "Error from AI Engine"
            });
        }
        
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};