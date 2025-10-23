const mongoose = require('mongoose');

const analysisNoteSchema = new mongoose.Schema({
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  analysisId: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  noteType: {
    type: String,
    enum: ['general', 'concern', 'recommendation', 'highlight'],
    default: 'general'
  },
  title: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  isPrivate: {
    type: Boolean,
    default: false // false = visible to company, true = CA only
  },
  attachments: [{
    filename: String,
    url: String,
    mimeType: String
  }],
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
analysisNoteSchema.index({ analysisId: 1, company: 1 });
analysisNoteSchema.index({ company: 1, createdBy: 1 });
analysisNoteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnalysisNote', analysisNoteSchema);
