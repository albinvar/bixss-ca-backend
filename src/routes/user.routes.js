const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin, authorize } = require('../middleware/rbac');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get(
  '/:userId',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  userController.getUserById
);

// Update user
router.put(
  '/:userId',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
  userController.updateUser
);

// Update user role (Super Admin only)
router.put(
  '/:userId/role',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('role')
      .isIn(['SUPER_ADMIN', 'CA', 'COMPANY_ADMIN', 'COMPANY_USER'])
      .withMessage('Invalid role'),
  ],
  validate,
  isSuperAdmin,
  userController.updateUserRole
);

// Deactivate user
router.put(
  '/:userId/deactivate',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
  userController.deactivateUser
);

// Activate user
router.put(
  '/:userId/activate',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
  userController.activateUser
);

// Delete user (Super Admin only)
router.delete(
  '/:userId',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  isSuperAdmin,
  userController.deleteUser
);

module.exports = router;
