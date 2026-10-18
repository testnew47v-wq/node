const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Define route
router.post('/', predictionController.predictMalnutritionRisk);

module.exports = router;