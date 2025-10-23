const express = require('express');
const router = express.Router();
const caController = require('../controllers/ca.controller');
const { authenticate } = require('../middleware/auth');
const { isCA } = require('../middleware/rbac');

/**
 * @swagger
 * tags:
 *   name: CA
 *   description: CA (Chartered Accountant) dashboard and management endpoints
 */

// All routes require authentication and CA role
router.use(authenticate);
router.use(isCA);

/**
 * @swagger
 * /api/ca/dashboard:
 *   get:
 *     summary: Get CA dashboard analytics
 *     description: Retrieve comprehensive dashboard data for the logged-in CA including assigned companies, analyses, documents, and activities
 *     tags: [CA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         assignedCompanies:
 *                           type: integer
 *                           description: Total number of companies assigned to this CA
 *                         newCompaniesThisMonth:
 *                           type: integer
 *                           description: New companies added this month
 *                         totalAnalyses:
 *                           type: integer
 *                           description: Total analyses across all companies
 *                         recentAnalyses:
 *                           type: integer
 *                           description: Analyses in last 30 days
 *                         totalDocuments:
 *                           type: integer
 *                           description: Total documents uploaded
 *                         recentDocuments:
 *                           type: integer
 *                           description: Documents uploaded in last 7 days
 *                         analysisStatus:
 *                           type: object
 *                           properties:
 *                             completed:
 *                               type: integer
 *                             processing:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                         successRate:
 *                           type: integer
 *                           description: Analysis success rate percentage
 *                     recentActivities:
 *                       type: array
 *                       description: Recent activities across all companies
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           action:
 *                             type: string
 *                           company:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                     companies:
 *                       type: array
 *                       description: All assigned companies with statistics
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           industry:
 *                             type: string
 *                           totalAnalyses:
 *                             type: integer
 *                           totalDocuments:
 *                             type: integer
 *                           lastAnalysisDate:
 *                             type: string
 *                             format: date-time
 *                           lastAnalysisStatus:
 *                             type: string
 *                           daysSinceLastActivity:
 *                             type: integer
 *                     companiesNeedingAttention:
 *                       type: array
 *                       description: Companies that need attention (no activity >30 days or failed analyses)
 *                     analysisTrend:
 *                       type: array
 *                       description: Daily analysis count for last 30 days
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - CA role required
 */
router.get('/dashboard', caController.getCADashboard);

module.exports = router;
