const Document = require('../models/Document');
const { AppError } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only PDF, Excel, Word, and Images are allowed.', 400));
    }
  }
});

/**
 * Upload documents
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const { companyId, category } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return next(new AppError('No files provided', 400));
    }

    if (!companyId) {
      return next(new AppError('Company ID is required', 400));
    }

    // Validate user has access to company
    if (req.user.role === 'CA') {
      // Check if CA is invited to this company
      const hasAccess = req.user.invitedCompanies.some(
        c => c.toString() === companyId
      );
      if (!hasAccess) {
        return next(new AppError('You do not have access to this company', 403));
      }
    } else if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(req.user.role)) {
      if (req.user.company.toString() !== companyId) {
        return next(new AppError('You can only upload to your own company', 403));
      }
    }

    // Map file type from mimetype
    const getFileType = (mimetype) => {
      if (mimetype.includes('pdf')) return 'pdf';
      if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'excel';
      if (mimetype.includes('word') || mimetype.includes('document')) return 'word';
      if (mimetype.includes('image')) return 'image';
      return 'other';
    };

    // Create document records
    const documents = await Promise.all(
      files.map(file => Document.create({
        filename: file.filename,
        originalName: file.originalname,
        fileType: getFileType(file.mimetype),
        mimeType: file.mimetype,
        size: file.size,
        category: category || 'Other',
        company: companyId,
        uploadedBy: req.user._id,
        storagePath: file.path,
        status: 'uploaded',
      }))
    );

    const populatedDocs = await Document.find({
      _id: { $in: documents.map(d => d._id) }
    })
      .populate('company', 'name')
      .populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      message: `${documents.length} document(s) uploaded successfully`,
      data: { documents: populatedDocs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documents for a company
 */
const getCompanyDocuments = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { status, category, page = 1, limit = 50 } = req.query;

    // Validate user has access to company
    if (req.user.role === 'CA') {
      const hasAccess = req.user.invitedCompanies.some(
        c => c.toString() === companyId
      );
      if (!hasAccess) {
        return next(new AppError('You do not have access to this company', 403));
      }
    } else if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(req.user.role)) {
      if (req.user.company.toString() !== companyId) {
        return next(new AppError('You can only view documents for your own company', 403));
      }
    }

    const query = { company: companyId };
    if (status) query.status = status;
    if (category) query.category = category;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        documents,
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
 * Get document by ID
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId)
      .populate('company', 'name')
      .populate('uploadedBy', 'name email');

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Check access
    if (req.user.role === 'CA') {
      const hasAccess = req.user.invitedCompanies.some(
        c => c.toString() === document.company._id.toString()
      );
      if (!hasAccess) {
        return next(new AppError('You do not have access to this document', 403));
      }
    } else if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(req.user.role)) {
      if (req.user.company.toString() !== document.company._id.toString()) {
        return next(new AppError('You can only view documents for your own company', 403));
      }
    }

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'CA') {
        const hasAccess = req.user.invitedCompanies.some(
          c => c.toString() === document.company.toString()
        );
        if (!hasAccess) {
          return next(new AppError('You do not have access to this document', 403));
        }
      } else if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(req.user.role)) {
        if (req.user.company.toString() !== document.company.toString()) {
          return next(new AppError('You can only delete documents for your own company', 403));
        }
      }
    }

    // Delete file from storage
    try {
      await fs.unlink(document.storagePath);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update document status (used after analysis)
 */
const updateDocumentStatus = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status, analysisId } = req.body;

    const document = await Document.findById(documentId);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    if (status) document.status = status;
    if (analysisId) document.analysisId = analysisId;

    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  uploadDocuments,
  getCompanyDocuments,
  getDocumentById,
  deleteDocument,
  updateDocumentStatus,
};
