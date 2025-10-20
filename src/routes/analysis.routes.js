const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { authenticate } = require('../middleware/auth');

// Store analysis from Python microservice (no auth needed for microservice)
router.post('/store', analysisController.storeAnalysis);

// Trigger analysis (proxy to Python microservice)
router.post('/trigger', authenticate, analysisController.triggerAnalysis);

// Get company analysis history (must come before /:analysisId)
router.get('/history/company/:companyId', authenticate, analysisController.getCompanyHistory);

// Compare company analyses (must come before /:analysisId)
router.get('/compare/company/:companyId', authenticate, analysisController.compareAnalyses);

// Get analysis by ID (must be last - catches everything else)
router.get('/:analysisId', authenticate, analysisController.getAnalysis);

module.exports = router;
