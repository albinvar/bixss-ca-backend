const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/rbac');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard and CA management endpoints (Super Admin only)
 */

// All routes require authentication and super admin role
router.use(authenticate);
router.use(isSuperAdmin);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get dashboard analytics
 *     description: Retrieve comprehensive system analytics including companies, CAs, analyses, and system health
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                     growth:
 *                       type: object
 *                     companiesByIndustry:
 *                       type: array
 *                     topCAs:
 *                       type: array
 *                     recentActivities:
 *                       type: array
 *                     systemHealth:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/analytics', adminController.getDashboardAnalytics);

/**
 * @swagger
 * /api/admin/cas:
 *   get:
 *     summary: Get all CAs
 *     description: Retrieve list of all CA users with pagination and filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: CAs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     cas:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/cas', adminController.getAllCAs);

/**
 * @swagger
 * /api/admin/cas:
 *   post:
 *     summary: Create new CA
 *     description: Create a new CA user account
 *     tags: [Admin]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       201:
 *         description: CA created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ca:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       409:
 *         description: Email already exists
 */
router.post(
  '/cas',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  adminController.createCA
);

/**
 * @swagger
 * /api/admin/cas/{caId}:
 *   get:
 *     summary: Get CA details
 *     description: Retrieve detailed information about a specific CA including assigned companies and statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *         description: CA user ID
 *     responses:
 *       200:
 *         description: CA details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ca:
 *                       $ref: '#/components/schemas/User'
 *                     assignedCompanies:
 *                       type: array
 *                     stats:
 *                       type: object
 *                     recentAnalyses:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: CA not found
 */
router.get(
  '/cas/:caId',
  [param('caId').isMongoId().withMessage('Invalid CA ID')],
  validate,
  adminController.getCADetails
);

/**
 * @swagger
 * /api/admin/cas/{caId}:
 *   put:
 *     summary: Update CA
 *     description: Update CA user information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *         description: CA user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe Updated
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.updated@example.com
 *     responses:
 *       200:
 *         description: CA updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ca:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: CA not found
 */
router.put(
  '/cas/:caId',
  [param('caId').isMongoId().withMessage('Invalid CA ID')],
  validate,
  adminController.updateCA
);

/**
 * @swagger
 * /api/admin/cas/{caId}:
 *   delete:
 *     summary: Delete CA
 *     description: Delete a CA user account (only if not assigned to any companies)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *         description: CA user ID
 *     responses:
 *       200:
 *         description: CA deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete CA with assigned companies
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: CA not found
 */
router.delete(
  '/cas/:caId',
  [param('caId').isMongoId().withMessage('Invalid CA ID')],
  validate,
  adminController.deleteCA
);

/**
 * @swagger
 * /api/admin/cas/{caId}/assign-companies:
 *   post:
 *     summary: Assign companies to CA
 *     description: Assign one or more companies to a CA user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *         description: CA user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIds
 *             properties:
 *               companyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["60d5ec49f1b2c72b8c8e4f1a", "60d5ec49f1b2c72b8c8e4f1b"]
 *                 description: Array of company IDs to assign
 *     responses:
 *       200:
 *         description: Companies assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ca:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: CA or company not found
 */
router.post(
  '/cas/:caId/assign-companies',
  [
    param('caId').isMongoId().withMessage('Invalid CA ID'),
    body('companyIds')
      .isArray({ min: 1 })
      .withMessage('Company IDs array is required'),
    body('companyIds.*').isMongoId().withMessage('Invalid company ID'),
  ],
  validate,
  adminController.assignCAToCompanies
);

/**
 * @swagger
 * /api/admin/cas/{caId}/remove-companies:
 *   post:
 *     summary: Remove companies from CA
 *     description: Remove one or more companies from a CA user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caId
 *         required: true
 *         schema:
 *           type: string
 *         description: CA user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIds
 *             properties:
 *               companyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["60d5ec49f1b2c72b8c8e4f1a"]
 *                 description: Array of company IDs to remove
 *     responses:
 *       200:
 *         description: Companies removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: CA not found
 */
router.post(
  '/cas/:caId/remove-companies',
  [
    param('caId').isMongoId().withMessage('Invalid CA ID'),
    body('companyIds')
      .isArray({ min: 1 })
      .withMessage('Company IDs array is required'),
    body('companyIds.*').isMongoId().withMessage('Invalid company ID'),
  ],
  validate,
  adminController.removeCAFromCompanies
);

module.exports = router;
