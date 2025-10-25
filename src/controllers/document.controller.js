const Document = require('../models/Document');
const { AppError } = require('../middleware/errorHandler');
const multer = require('multer');
const s3Service = require('../services/s3Service');

// Configure multer to use memory storage (files stored as Buffer in memory)
// This allows us to upload to either local storage or S3 without hitting disk first
const storage = multer.memoryStorage();

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

    // Upload files using S3Service (handles both S3 and local storage)
    const uploadedFiles = await Promise.all(
      files.map(file => s3Service.uploadFile(file, 'documents'))
    );

    // Create document records with storage info
    const documents = await Promise.all(
      uploadedFiles.map((fileInfo, index) => Document.create({
        filename: fileInfo.originalName,
        originalName: fileInfo.originalName,
        fileType: getFileType(files[index].mimetype),
        mimeType: files[index].mimetype,
        size: fileInfo.size,
        category: category || 'Other',
        company: companyId,
        uploadedBy: req.user._id,
        storagePath: fileInfo.path || fileInfo.key, // local path or S3 key
        storageType: fileInfo.storage, // 'local' or 's3'
        s3Bucket: fileInfo.bucket, // S3 bucket (if S3)
        s3Key: fileInfo.key, // S3 key (if S3)
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

    // Delete file from storage using S3Service
    try {
      await s3Service.deleteFile({
        storage: document.storageType,
        path: document.storagePath,
        bucket: document.s3Bucket,
        key: document.s3Key
      });
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
