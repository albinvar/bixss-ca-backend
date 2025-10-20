const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  // Basic Info
  analysisId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Documents
  documents: [{
    documentId: mongoose.Schema.Types.ObjectId,
    filename: String,
    fileType: String
  }],
  documentCount: {
    type: Number,
    default: 0
  },
  totalPagesProcessed: {
    type: Number,
    default: 0
  },

  // Analysis Data (from Python microservice)
  // Store as JSONB-like structure matching PostgreSQL
  consolidatedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Contains: company_information, balance_sheet_data, income_statement_data,
    // cash_flow_data, comprehensive_financial_metrics, trend_analysis,
    // risk_assessment, industry_benchmarking, analysis_metadata, etc.
  },

  healthAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Contains: liquidity_assessment, profitability_assessment, leverage_assessment,
    // efficiency_assessment, growth_assessment, key_strengths, areas_of_concern,
    // immediate_recommendations, strategic_recommendations, confidence_score, etc.
  },

  // Status
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },

  // Job tracking
  jobId: {
    type: String,
    index: true
  },

  // Error handling
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
analysisSchema.index({ company: 1, createdAt: -1 });
analysisSchema.index({ uploadedBy: 1, createdAt: -1 });
analysisSchema.index({ status: 1, createdAt: -1 });

// Virtual for getting company name
analysisSchema.virtual('companyName', {
  ref: 'Company',
  localField: 'company',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Analysis', analysisSchema);
