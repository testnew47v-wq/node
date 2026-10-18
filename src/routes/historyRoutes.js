// api-gateway-node/src/routes/historyRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Dynamic Model for MongoDB 'predictionrecords' collection
const predictionSchema = new mongoose.Schema({}, { strict: false, collection: 'predictionrecords' });
const PredictionRecord = mongoose.models.PredictionRecord || mongoose.model('PredictionRecord', predictionSchema);

router.get('/', async (req, res) => {
    try {
        // Database se saare records layen (Sab se naye records pehle)
        const records = await PredictionRecord.find().sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error("History fetch error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching history" });
    }
});

module.exports = router;