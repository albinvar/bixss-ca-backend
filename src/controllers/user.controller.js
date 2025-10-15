const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, company, search = '' } = req.query;

    const query = {};

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by company
    if (company) {
      query.company = company;
    }

    // If not super admin, limit to accessible users
    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'COMPANY_ADMIN') {
        query.company = req.user.company;
      } else if (req.user.role === 'CA') {
        // CA can see users from invited companies
        query.$or = [
          { _id: req.user._id },
          { company: { $in: req.user.invitedCompanies } },
        ];
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .populate('company', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('company', 'name')
      .populate('invitedCompanies', 'name');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check access permissions
    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'COMPANY_ADMIN') {
        if (user.company && user.company._id.toString() !== req.user.company.toString()) {
          return next(new AppError('Access denied', 403));
        }
      } else if (req.user._id.toString() !== userId) {
        return next(new AppError('Access denied', 403));
      }
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates.password;
    delete updates.refreshToken;
    delete updates.role; // Role should be updated separately
    delete updates.company; // Company should be updated separately

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).populate('company', 'name');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (Super Admin only)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Don't allow changing super admin role
    if (user.role === 'SUPER_ADMIN') {
      return next(new AppError('Cannot change super admin role', 400));
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate user
 */
const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Don't allow deactivating super admin
    if (user.role === 'SUPER_ADMIN') {
      return next(new AppError('Cannot deactivate super admin', 400));
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate user
 */
const activateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (Super Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Don't allow deleting super admin
    if (user.role === 'SUPER_ADMIN') {
      return next(new AppError('Cannot delete super admin', 400));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
};
