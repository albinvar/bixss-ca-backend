const { body, param } = require('express-validator');

const createCompanyValidator = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Company name must be at least 2 characters long'),
  body('representative')
    .notEmpty()
    .withMessage('Representative user ID is required')
    .isMongoId()
    .withMessage('Invalid representative user ID'),
  body('description')
    .optional()
    .trim(),
  body('registrationNumber')
    .optional()
    .trim(),
  body('address')
    .optional(),
  body('contactInfo')
    .optional(),
];

const updateCompanyValidator = [
  param('companyId')
    .isMongoId()
    .withMessage('Invalid company ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Company name must be at least 2 characters long'),
  body('description')
    .optional()
    .trim(),
  body('registrationNumber')
    .optional()
    .trim(),
  body('address')
    .optional(),
  body('contactInfo')
    .optional(),
];

const companyIdValidator = [
  param('companyId')
    .isMongoId()
    .withMessage('Invalid company ID'),
];

const inviteCAValidator = [
  param('companyId')
    .isMongoId()
    .withMessage('Invalid company ID'),
  body('caId')
    .notEmpty()
    .withMessage('CA user ID is required')
    .isMongoId()
    .withMessage('Invalid CA user ID'),
];

const addCompanyAdminValidator = [
  param('companyId')
    .isMongoId()
    .withMessage('Invalid company ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

module.exports = {
  createCompanyValidator,
  updateCompanyValidator,
  companyIdValidator,
  inviteCAValidator,
  addCompanyAdminValidator,
};
