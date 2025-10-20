const Analysis = require('../models/Analysis');
const Company = require('../models/Company');
const Document = require('../models/Document');
const { v4: uuidv4 } = require('uuid');

// Store analysis result from Python microservice
exports.storeAnalysis = async (req, res) => {
  try {
    const {
      jobId,
      companyId,
      documentIds,
      analysisData,
      uploadedBy
    } = req.body;

    // Validate required fields
    if (!jobId || !companyId || !analysisData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: jobId, companyId, or analysisData'
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get document details if provided
    let documents = [];
    if (documentIds && documentIds.length > 0) {
      const docs = await Document.find({ _id: { $in: documentIds } });
      documents = docs.map(doc => ({
        documentId: doc._id,
        filename: doc.originalName || doc.filename,
        fileType: doc.fileType
      }));
    }

    // Create analysis record
    const analysis = new Analysis({
      analysisId: uuidv4(),
      company: companyId,
      uploadedBy: uploadedBy || req.user?._id,
      jobId,
      documents,
      documentCount: documents.length,
      totalPagesProcessed: analysisData.metadata?.total_pages_processed || 0,

      // Store the complete analysis data
      companyInformation: analysisData.company_information || {},
      balanceSheetData: analysisData.balance_sheet_data || {},
      incomeStatementData: analysisData.income_statement_data || {},
      cashFlowData: analysisData.cash_flow_data || {},
      comprehensiveFinancialMetrics: analysisData.comprehensive_financial_metrics || {},
      financialHealthAnalysis: analysisData.financial_health_analysis || {},
      trendAnalysis: analysisData.trend_analysis || {},
      riskAssessment: analysisData.risk_assessment || {},
      industryBenchmarking: analysisData.industry_benchmarking || {},
      analysisMetadata: analysisData.analysis_metadata || {},
      consolidationMetadata: analysisData.consolidation_metadata || {},

      status: 'completed'
    });

    await analysis.save();

    // Update document statuses
    if (documentIds && documentIds.length > 0) {
      await Document.updateMany(
        { _id: { $in: documentIds } },
        {
          status: 'analyzed',
          analysisId: analysis.analysisId
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Analysis stored successfully',
      data: {
        analysisId: analysis.analysisId,
        _id: analysis._id
      }
    });

  } catch (error) {
    console.error('Store analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store analysis',
      error: error.message
    });
  }
};

// Get analysis by ID
exports.getAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({ analysisId })
      .populate('company', 'name industry')
      .populate('uploadedBy', 'name email');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Return in same format as PostgreSQL API
    const consolidatedData = analysis.consolidatedData || {};

    res.json({
      success: true,
      data: {
        analysis_id: analysis.analysisId,
        company_id: analysis.company._id,
        company_information: consolidatedData.company_information || {},
        balance_sheet_data: consolidatedData.balance_sheet_data || {},
        income_statement_data: consolidatedData.income_statement_data || {},
        cash_flow_data: consolidatedData.cash_flow_data || {},
        financial_metrics: consolidatedData.comprehensive_financial_metrics || {},
        health_analysis: analysis.healthAnalysis || {},
        trend_analysis: consolidatedData.trend_analysis || {},
        risk_assessment: consolidatedData.risk_assessment || {},
        industry_benchmarking: consolidatedData.industry_benchmarking || {},
        document_count: analysis.documentCount,
        total_pages_processed: analysis.totalPagesProcessed,
        created_at: analysis.createdAt,
        filenames: analysis.documents.map(d => d.filename),
        metadata: consolidatedData.analysis_metadata || {}
      }
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis',
      error: error.message
    });
  }
};

// Get company analysis history
exports.getCompanyHistory = async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const analyses = await Analysis.find({
      company: companyId,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('company', 'name')
      .lean();

    const company = await Company.findById(companyId);

    const formattedAnalyses = analyses.map(analysis => {
      const metrics = analysis.consolidatedData?.comprehensive_financial_metrics || {};
      return {
        analysis_id: analysis.analysisId,
        date: analysis.createdAt,
        health_status: analysis.healthAnalysis?.liquidity_assessment?.status || 'N/A',
        confidence_score: analysis.healthAnalysis?.confidence_score || 0,
        document_count: analysis.documentCount,
        key_metrics: {
          current_ratio: metrics.liquidity_ratios?.current_ratio?.current_year?.value,
          net_margin: metrics.profitability_ratios?.net_margin?.current_year?.value,
          debt_to_equity: metrics.leverage_ratios?.debt_to_equity?.current_year?.value,
          roe: metrics.profitability_ratios?.return_on_equity_roe?.current_year?.value
        }
      };
    });

    res.json({
      success: true,
      data: {
        company_id: companyId,
        company_name: company?.name || 'Unknown',
        total_analyses: formattedAnalyses.length,
        first_analysis_date: analyses[analyses.length - 1]?.createdAt,
        last_analysis_date: analyses[0]?.createdAt,
        latest_grade: formattedAnalyses[0]?.health_status || 'N/A',
        grade_trend: calculateTrend(formattedAnalyses),
        analyses: formattedAnalyses,
        trend_data: {}
      }
    });

  } catch (error) {
    console.error('Get company history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company history',
      error: error.message
    });
  }
};

// Compare analyses
exports.compareAnalyses = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { analysisIds, startDate, endDate } = req.query;

    let query = {
      company: companyId,
      status: 'completed'
    };

    // Filter by specific analysis IDs if provided
    if (analysisIds) {
      const ids = analysisIds.split(',');
      query.analysisId = { $in: ids };
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const analyses = await Analysis.find(query)
      .sort({ createdAt: 1 })
      .populate('company', 'name')
      .lean();

    if (analyses.length < 2) {
      return res.status(400).json({
        success: false,
        message: `Found only ${analyses.length} analysis. At least 2 required for comparison.`
      });
    }

    // Build comparison data
    const comparisonData = buildComparisonData(analyses);

    res.json({
      success: true,
      data: {
        comparison_id: uuidv4(),
        company_id: companyId,
        company_name: analyses[0].company.name,
        analyses_count: analyses.length,
        date_range: {
          start: analyses[0].createdAt,
          end: analyses[analyses.length - 1].createdAt
        },
        ...comparisonData
      }
    });

  } catch (error) {
    console.error('Compare analyses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare analyses',
      error: error.message
    });
  }
};

// Helper function to calculate trend
function calculateTrend(analyses) {
  if (analyses.length < 2) return 'insufficient_data';

  const statusMap = { excellent: 4, good: 3, fair: 2, poor: 1 };
  const first = statusMap[analyses[analyses.length - 1]?.health_status?.toLowerCase()] || 2;
  const last = statusMap[analyses[0]?.health_status?.toLowerCase()] || 2;

  if (last > first) return 'improving';
  if (last < first) return 'declining';
  return 'stable';
}

// Helper function to build comparison data
function buildComparisonData(analyses) {
  const metricTrends = {};
  const healthProgression = [];

  // Extract health progression
  analyses.forEach(analysis => {
    healthProgression.push({
      date: analysis.createdAt,
      analysis_id: analysis.analysisId,
      health_status: analysis.healthAnalysis?.liquidity_assessment?.status || 'N/A',
      confidence_score: analysis.healthAnalysis?.confidence_score || 0
    });
  });

  // Extract metric trends
  const metricCategories = [
    'liquidity_ratios',
    'profitability_ratios',
    'leverage_ratios',
    'efficiency_ratios'
  ];

  metricCategories.forEach(category => {
    analyses.forEach(analysis => {
      const metrics = analysis.consolidatedData?.comprehensive_financial_metrics || {};
      const categoryData = metrics[category] || {};

      Object.entries(categoryData).forEach(([metricName, metricData]) => {
        const key = `${category}.${metricName}`;
        if (!metricTrends[key]) {
          metricTrends[key] = [];
        }

        const value = metricData?.current_year?.value;
        if (value !== null && value !== undefined) {
          metricTrends[key].push({
            date: analysis.createdAt,
            value: value,
            analysis_id: analysis.analysisId
          });
        }
      });
    });
  });

  // Calculate improvements and declines
  const improving = [];
  const declining = [];

  Object.entries(metricTrends).forEach(([metric, values]) => {
    if (values.length >= 2) {
      const first = values[0].value;
      const last = values[values.length - 1].value;
      const change = ((last - first) / Math.abs(first)) * 100;

      if (change > 5) improving.push({ metric, change });
      if (change < -5) declining.push({ metric, change });
    }
  });

  return {
    health_progression: healthProgression,
    metric_trends: metricTrends,
    improving_metrics: improving,
    declining_metrics: declining,
    summary: generateSummary(improving, declining, healthProgression)
  };
}

// Trigger analysis by sending documents to Python microservice
exports.triggerAnalysis = async (req, res) => {
  try {
    const { documentIds, companyId, companyName, analysisType = 'comprehensive' } = req.body;

    // Validate inputs
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'documentIds array is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'companyId is required'
      });
    }

    // Fetch documents from MongoDB
    const documents = await Document.find({
      _id: { $in: documentIds },
      company: companyId
    });

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No documents found with provided IDs for this company'
      });
    }

    // Prepare file data for Python
    const fs = require('fs').promises;
    const FormData = require('form-data');
    const axios = require('axios');

    const formData = new FormData();

    // Add each document file to form data
    for (const doc of documents) {
      try {
        const fileBuffer = await fs.readFile(doc.storagePath);
        formData.append('files', fileBuffer, {
          filename: doc.originalName,
          contentType: doc.mimeType
        });
      } catch (error) {
        console.error(`Failed to read file ${doc.storagePath}:`, error);
      }
    }

    // Add metadata
    formData.append('company_id', companyId);
    formData.append('company_name', companyName || 'Unknown Company');
    formData.append('analysis_type', analysisType);

    // Forward to Python microservice's stateless analyze-files endpoint
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${pythonUrl}/api/analysis/analyze-files`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log('Python analysis response:', response.data);

    // Return Python's response (includes job_id)
    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Error triggering analysis:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger analysis',
      error: error.response?.data || error.message
    });
  }
};

// Helper function to generate summary
function generateSummary(improving, declining, healthProgression) {
  const trend = improving.length > declining.length ? 'improving' :
                declining.length > improving.length ? 'declining' : 'stable';

  return `Overall trend is ${trend}. ${improving.length} metrics improving, ${declining.length} metrics declining. ` +
         `Latest health status: ${healthProgression[healthProgression.length - 1]?.health_status || 'N/A'}.`;
}
