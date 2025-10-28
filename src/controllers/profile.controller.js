const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');

/**
 * @route   GET /api/profile
 * @desc    Get current user's profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('company', 'name industry registrationNumber address phone email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is a CA, get additional stats
    let stats = null;
    if (user.role === 'ca') {
      const Company = require('../models/Company');
      const Analysis = require('../models/Analysis');

      const [totalClients, totalAnalyses] = await Promise.all([
        Company.countDocuments({ assignedCA: userId }),
        Analysis.countDocuments({ assignedCA: userId })
      ]);

      stats = {
        totalClients,
        totalAnalyses
      };
    }

    // If user is a company user, get company details
    if (user.role === 'company' && user.company) {
      const companyDetails = await Company.findById(user.company).select('-__v');

      return res.json({
        success: true,
        data: {
          user: user.toObject(),
          company: companyDetails,
          stats
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toObject(),
        stats
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/profile
 * @desc    Update current user's profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Email update (check if already exists)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email;
    }

    // Password update
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash and set new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    // Return updated user (without password)
    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('company', 'name industry registrationNumber');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/profile/company
 * @desc    Update company profile (for company users)
 * @access  Private (Company users only)
 */
exports.updateCompanyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Only company users can update company profile'
      });
    }

    if (!user.company) {
      return res.status(404).json({
        success: false,
        message: 'No company associated with this user'
      });
    }

    const {
      name,
      industry,
      registrationNumber,
      address,
      phone,
      email
    } = req.body;

    const company = await Company.findById(user.company);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update company fields
    if (name) company.name = name;
    if (industry) company.industry = industry;
    if (registrationNumber) company.registrationNumber = registrationNumber;
    if (address) company.address = address;
    if (phone) company.phone = phone;
    if (email) company.email = email;

    await company.save();

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: {
        company
      }
    });

  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company profile',
      error: error.message
    });
  }
};
