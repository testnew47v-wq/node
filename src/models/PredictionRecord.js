const mongoose = require('mongoose');

const predictionRecordSchema = new mongoose.Schema({
    userId: {
        type: String, // From Firebase UID
        required: true,
    },
    inputData: {
        type: Object, // Raw Flutter UI labels
        required: true,
    },
    predictionCode: {
        type: Number, // 0 or 1
        required: true,
    },
    status: {
        type: String, // "Healthy / Normal" or "Malnutrition Risk Detected"
        required: true,
    },
    confidenceScore: {
        type: String, // e.g., "88.89%"
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('PredictionRecord', predictionRecordSchema);