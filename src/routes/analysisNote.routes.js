const express = require('express');
const router = express.Router();
const analysisNoteController = require('../controllers/analysisNote.controller');
const { authenticate } = require('../middleware/auth');
const { isCA } = require('../middleware/rbac');

// Get notes by analysis ID
router.get('/analysis/:analysisId', authenticate, analysisNoteController.getNotesByAnalysis);

// Get notes by company ID
router.get('/company/:companyId', authenticate, analysisNoteController.getNotesByCompany);

// Create note (CA only)
router.post('/', authenticate, isCA, analysisNoteController.createNote);

// Update note (CA only)
router.put('/:noteId', authenticate, isCA, analysisNoteController.updateNote);

// Delete note (CA only)
router.delete('/:noteId', authenticate, isCA, analysisNoteController.deleteNote);

module.exports = router;
