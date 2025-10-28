const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', authenticate, profileController.getProfile);

// @route   PUT /api/profile
// @desc    Update current user's profile
// @access  Private
router.put('/', authenticate, profileController.updateProfile);

// @route   PUT /api/profile/company
// @desc    Update company profile (company users only)
// @access  Private
router.put('/company', authenticate, profileController.updateCompanyProfile);

module.exports = router;
