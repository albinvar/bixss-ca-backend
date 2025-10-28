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

    // Create analysis record with new dual extraction structure
    const analysis = new Analysis({
      analysisId: uuidv4(),
      company: companyId,
      uploadedBy: uploadedBy || req.user?._id,
      jobId,
      documents,
      documentCount: documents.length,
      totalPagesProcessed: analysisData.metadata?.total_pages_processed || 0,

      // Store the complete analysis data in consolidatedData
      consolidatedData: {
        company_information: analysisData.company_information || {},

        // NEW: Dual extraction data
        extracted_fields: analysisData.extracted_fields || {},  // ALL original fields
        standardized_fields: analysisData.standardized_fields || {},  // Mapped fields
        calculated_metrics: analysisData.calculated_metrics || {},  // Smart ratios

        // Legacy support (keep for backward compatibility)
        balance_sheet_data: analysisData.balance_sheet_data || {},
        income_statement_data: analysisData.income_statement_data || {},
        cash_flow_data: analysisData.cash_flow_data || {},
        comprehensive_financial_metrics: analysisData.comprehensive_financial_metrics || {},

        trend_analysis: analysisData.trend_analysis || {},
        risk_assessment: analysisData.risk_assessment || {},
        industry_benchmarking: analysisData.industry_benchmarking || {},
        future_outlook: analysisData.future_outlook || {},
        executive_summary: analysisData.executive_summary || {},
        detailed_analysis: analysisData.detailed_analysis || {},
        graphical_data: analysisData.graphical_data || {},
        strategic_recommendations: analysisData.strategic_recommendations || [],
        key_findings: analysisData.key_findings || {},
        analysis_metadata: analysisData.analysis_metadata || {},
        consolidation_metadata: analysisData.consolidation_metadata || {}
      },

      // Store health analysis separately as expected by the model
      healthAnalysis: analysisData.financial_health_analysis || {},

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

    // Return with new dual extraction structure
    const consolidatedData = analysis.consolidatedData || {};

    // Extract available years from company_information
    const companyInfo = consolidatedData.company_information || {};
    const availableYears = companyInfo.available_years || [];

    res.json({
      success: true,
      data: {
        analysis_id: analysis.analysisId,
        company_id: analysis.company._id,
        company_information: companyInfo,
        available_years: availableYears,  // Add top-level for easy access

        // NEW: Dual extraction data
        extracted_fields: consolidatedData.extracted_fields || {},  // ALL original fields
        standardized_fields: consolidatedData.standardized_fields || {},  // Mapped fields
        calculated_metrics: consolidatedData.calculated_metrics || {},  // Smart ratios with availability flags

        // Legacy fields (for backward compatibility with existing frontend)
        balance_sheet_data: consolidatedData.balance_sheet_data || {},
        income_statement_data: consolidatedData.income_statement_data || {},
        cash_flow_data: consolidatedData.cash_flow_data || {},
        financial_metrics: consolidatedData.comprehensive_financial_metrics || {},

        // Analysis and insights
        health_analysis: analysis.healthAnalysis || {},
        trend_analysis: consolidatedData.trend_analysis || {},
        risk_assessment: consolidatedData.risk_assessment || {},
        industry_benchmarking: consolidatedData.industry_benchmarking || {},
        graphical_data: consolidatedData.graphical_data || {},
        executive_summary: consolidatedData.executive_summary || {},
        detailed_analysis: consolidatedData.detailed_analysis || {},
        future_outlook: consolidatedData.future_outlook || {},
        strategic_recommendations: consolidatedData.strategic_recommendations || [],

        // Metadata
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
  const analysesComparison = [];

  // Build detailed comparison for each analysis
  analyses.forEach(analysis => {
    const analysisData = {
      analysis_id: analysis.analysisId,
      created_at: analysis.createdAt,
      company_information: analysis.consolidatedData?.company_information || {},

      // NEW: Dual extraction data from analysis API
      extracted_fields: analysis.consolidatedData?.extracted_fields || {},
      standardized_fields: analysis.consolidatedData?.standardized_fields || {},
      calculated_metrics: analysis.consolidatedData?.calculated_metrics || {},

      // Legacy data for backward compatibility
      balance_sheet_data: analysis.consolidatedData?.balance_sheet_data || {},
      income_statement_data: analysis.consolidatedData?.income_statement_data || {},
      cash_flow_data: analysis.consolidatedData?.cash_flow_data || {},
      comprehensive_financial_metrics: analysis.consolidatedData?.comprehensive_financial_metrics || {},

      // Health analysis
      health_analysis: analysis.healthAnalysis || {}
    };

    analysesComparison.push(analysisData);

    // Extract health progression
    healthProgression.push({
      date: analysis.createdAt,
      analysis_id: analysis.analysisId,
      health_status: analysis.healthAnalysis?.liquidity_assessment?.status || 'N/A',
      confidence_score: analysis.healthAnalysis?.confidence_score || 0
    });
  });

  // Extract metric trends from CALCULATED_METRICS (new dual extraction)
  analyses.forEach(analysis => {
    const calculatedMetrics = analysis.consolidatedData?.calculated_metrics || {};

    Object.entries(calculatedMetrics).forEach(([metricName, metricData]) => {
      if (!metricTrends[metricName]) {
        metricTrends[metricName] = [];
      }

      // Handle both old and new metric data structures
      let value = null;

      if (metricData?.value !== null && metricData?.value !== undefined) {
        value = metricData.value;
      } else if (metricData?.current_year?.value !== null && metricData?.current_year?.value !== undefined) {
        value = metricData.current_year.value;
      }

      if (value !== null && value !== undefined && metricData?.available !== false) {
        metricTrends[metricName].push({
          date: analysis.createdAt,
          value: value,
          analysis_id: analysis.analysisId,
          unit: metricData?.unit || '',
          category: metricData?.category || 'other'
        });
      }
    });
  });

  // Calculate improvements and declines
  const improving = [];
  const declining = [];

  Object.entries(metricTrends).forEach(([metric, values]) => {
    if (values.length >= 2) {
      const first = values[0].value;
      const last = values[values.length - 1].value;

      if (Math.abs(first) < 0.0001) return; // Skip if first value is too close to zero

      const change = ((last - first) / Math.abs(first)) * 100;

      if (change > 5) improving.push({
        metric,
        change: parseFloat(change.toFixed(2)),
        first_value: first,
        last_value: last,
        unit: values[0].unit,
        category: values[0].category
      });
      if (change < -5) declining.push({
        metric,
        change: parseFloat(change.toFixed(2)),
        first_value: first,
        last_value: last,
        unit: values[0].unit,
        category: values[0].category
      });
    }
  });

  return {
    analyses: analysesComparison,
    health_progression: healthProgression,
    metric_trends: metricTrends,
    improving_metrics: improving.sort((a, b) => b.change - a.change),
    declining_metrics: declining.sort((a, b) => a.change - b.change),
    summary: generateSummary(improving, declining, healthProgression)
  };
}

// Trigger analysis by sending documents to Python microservice
exports.triggerAnalysis = async (req, res) => {
  try {
    const { documentIds, companyId, companyName, analysisType = 'comprehensive', industry, benchmarkId } = req.body;

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

    // Fetch benchmark values
    const Benchmark = require('../models/Benchmark');
    let benchmark;

    if (benchmarkId) {
      // Use specific benchmark if provided
      benchmark = await Benchmark.findById(benchmarkId);
    } else {
      // Use default benchmark for industry
      benchmark = await Benchmark.findOne({
        industry: industry || 'General',
        isDefault: true
      });

      // Fallback to general default if industry-specific not found
      if (!benchmark) {
        benchmark = await Benchmark.findOne({
          industry: 'General',
          isDefault: true
        });
      }
    }

    // Prepare file data for Python based on storage type
    const fs = require('fs').promises;
    const FormData = require('form-data');
    const axios = require('axios');
    const s3Service = require('../services/s3Service');
    const config = require('../config/config');

    const formData = new FormData();
    const isS3Mode = config.storage.type === 's3';

    if (isS3Mode) {
      // S3 MODE: Send presigned URLs instead of file buffers
      const fileUrls = [];

      for (const doc of documents) {
        try {
          // Generate presigned URL (valid for 1 hour)
          const presignedUrl = await s3Service.getFileUrl({
            storage: doc.storageType,
            bucket: doc.s3Bucket,
            key: doc.s3Key
          }, 3600);

          fileUrls.push({
            url: presignedUrl,
            filename: doc.originalName,
            mimeType: doc.mimeType
          });
        } catch (error) {
          console.error(`Failed to generate presigned URL for ${doc.originalName}:`, error);
        }
      }

      // Send URLs as JSON to Python
      formData.append('file_urls', JSON.stringify(fileUrls));
      console.log(`📎 Sending ${fileUrls.length} presigned URLs to Python microservice`);
    } else {
      // LOCAL MODE: Send file buffers as before
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
      console.log(`📎 Sending ${documents.length} file buffers to Python microservice`);
    }

    // Add metadata
    formData.append('company_id', companyId);
    formData.append('company_name', companyName || 'Unknown Company');
    formData.append('analysis_type', analysisType);

    // Add benchmark values if available
    if (benchmark) {
      formData.append('benchmarks', JSON.stringify({
        industry: benchmark.industry,
        liquidityRatios: benchmark.liquidityRatios,
        profitabilityRatios: benchmark.profitabilityRatios,
        leverageRatios: benchmark.leverageRatios,
        efficiencyRatios: benchmark.efficiencyRatios
      }));
      console.log(`Using benchmark: ${benchmark.name} (${benchmark.industry})`);
    } else {
      console.warn('No benchmark found, analysis will use default thresholds');
    }

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
