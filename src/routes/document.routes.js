const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management endpoints
 */

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - files
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               category:
 *                 type: string
 *                 description: Document category
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Documents uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/upload',
  authenticate,
  documentController.upload.array('files', 10),
  documentController.uploadDocuments
);

/**
 * @swagger
 * /api/documents/company/{companyId}:
 *   get:
 *     summary: Get all documents for a company
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [uploaded, processing, analyzed, failed]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/company/:companyId', authenticate, documentController.getCompanyDocuments);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       404:
 *         description: Document not found
 */
router.get('/:documentId', authenticate, documentController.getDocumentById);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     summary: Delete document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router.delete('/:documentId', authenticate, documentController.deleteDocument);

/**
 * @swagger
 * /api/documents/{documentId}/status:
 *   put:
 *     summary: Update document status
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
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
 *               status:
 *                 type: string
 *                 enum: [uploaded, processing, analyzed, failed]
 *               analysisId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document status updated
 *       404:
 *         description: Document not found
 */
router.put('/:documentId/status', authenticate, documentController.updateDocumentStatus);

module.exports = router;
