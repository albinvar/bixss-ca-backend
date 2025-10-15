const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin, isCompanyAdmin, hasCompanyAccess } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createCompanyValidator,
  updateCompanyValidator,
  companyIdValidator,
  inviteCAValidator,
  addCompanyAdminValidator,
} = require('../validators/company.validator');

/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Company management
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name
 *     responses:
 *       200:
 *         description: List of companies
 *       401:
 *         description: Unauthorized
 */
router.get('/', companyController.getAllCompanies);

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company (Super Admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - representative
 *             properties:
 *               name:
 *                 type: string
 *               representative:
 *                 type: string
 *                 description: User ID of the representative
 *               description:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *       403:
 *         description: Access denied
 */
router.post('/', isSuperAdmin, createCompanyValidator, validate, companyController.createCompany);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company details
 *       404:
 *         description: Company not found
 */
router.get('/:companyId', companyIdValidator, validate, hasCompanyAccess, companyController.getCompanyById);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   put:
 *     summary: Update company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       403:
 *         description: Access denied
 */
router.put('/:companyId', updateCompanyValidator, validate, isCompanyAdmin, companyController.updateCompany);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   delete:
 *     summary: Delete company (Super Admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *       403:
 *         description: Access denied
 */
router.delete('/:companyId', companyIdValidator, validate, isSuperAdmin, companyController.deleteCompany);

/**
 * @swagger
 * /api/companies/{companyId}/invite-ca:
 *   post:
 *     summary: Invite CA to company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caId
 *             properties:
 *               caId:
 *                 type: string
 *                 description: CA user ID
 *     responses:
 *       200:
 *         description: CA invited successfully
 *       403:
 *         description: Access denied
 */
router.post('/:companyId/invite-ca', inviteCAValidator, validate, isCompanyAdmin, companyController.inviteCA);

/**
 * @swagger
 * /api/companies/{companyId}/ca/{caId}:
 *   delete:
 *     summary: Remove CA from company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CA removed successfully
 *       403:
 *         description: Access denied
 */
router.delete('/:companyId/ca/:caId', companyIdValidator, validate, isCompanyAdmin, companyController.removeCA);

/**
 * @swagger
 * /api/companies/{companyId}/admins:
 *   post:
 *     summary: Add company admin (Super Admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin added successfully
 *       403:
 *         description: Access denied
 */
router.post('/:companyId/admins', addCompanyAdminValidator, validate, isSuperAdmin, companyController.addCompanyAdmin);

/**
 * @swagger
 * /api/companies/{companyId}/admins/{userId}:
 *   delete:
 *     summary: Remove company admin (Super Admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin removed successfully
 *       403:
 *         description: Access denied
 */
router.delete('/:companyId/admins/:userId', companyIdValidator, validate, isSuperAdmin, companyController.removeCompanyAdmin);

module.exports = router;
