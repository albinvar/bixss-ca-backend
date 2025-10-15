const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, role, company } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Validate role-specific requirements
    if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(role) && !company) {
      return next(new AppError('Company is required for company-level users', 400));
    }

    // Only super admin can create super admin accounts
    if (role === 'SUPER_ADMIN' && (!req.user || req.user.role !== 'SUPER_ADMIN')) {
      return next(new AppError('Only super admins can create super admin accounts', 403));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role,
      company: company || null,
    });

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if refresh token matches
    if (user.refreshToken !== refreshToken) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    req.user.refreshToken = null;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company', 'name');

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};
