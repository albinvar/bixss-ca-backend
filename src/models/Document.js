const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'excel', 'word', 'image', 'other'],
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Tax Returns',
        'Financial Statements',
        'GST Returns',
        'Compliance Documents',
        'Audit Reports',
        'Invoices',
        'Receipts',
        'Contracts',
        'Other',
      ],
      default: 'Other',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    analysisId: {
      type: String,
      default: null,
    },
    storagePath: {
      type: String,
      required: true,
    },
    storageType: {
      type: String,
      enum: ['local', 's3'],
      default: 'local',
    },
    s3Bucket: {
      type: String,
      default: null,
    },
    s3Key: {
      type: String,
      default: null,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentSchema.index({ company: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ analysisId: 1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
