const express = require('express');
const { authenticate } = require('../middleware/auth');
const pdfController = require('../controllers/pdf.controller');

const router = express.Router();

// Generate PDF for an analysis
router.post(
  '/analysis/:analysisId/export',
  authenticate,
  pdfController.generateAnalysisPDF
);

module.exports = router;
