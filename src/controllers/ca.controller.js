const User = require('../models/User');
const Company = require('../models/Company');
const Analysis = require('../models/Analysis');
const Document = require('../models/Document');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get CA dashboard analytics
 */
const getCADashboard = async (req, res, next) => {
  try {
    const caId = req.user._id;

    // Get all companies assigned to this CA
    const assignedCompanies = await Company.find({ assignedCA: caId })
      .select('name industry createdAt')
      .lean();

    const companyIds = assignedCompanies.map(c => c._id);

    // Get counts and metrics
    const [
      totalAnalyses,
      completedAnalyses,
      processingAnalyses,
      failedAnalyses,
      totalDocuments,
      recentDocuments,
      recentAnalyses
    ] = await Promise.all([
      // Total analyses for CA's companies
      Analysis.countDocuments({ company: { $in: companyIds } }),

      // Completed analyses
      Analysis.countDocuments({ company: { $in: companyIds }, status: 'completed' }),

      // Processing analyses
      Analysis.countDocuments({ company: { $in: companyIds }, status: 'processing' }),

      // Failed analyses
      Analysis.countDocuments({ company: { $in: companyIds }, status: 'failed' }),

      // Total documents
      Document.countDocuments({ company: { $in: companyIds } }),

      // Recent documents (last 7 days)
      Document.countDocuments({
        company: { $in: companyIds },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),

      // Recent analyses (last 30 days)
      Analysis.countDocuments({
        company: { $in: companyIds },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get new companies added this month
    const newCompaniesThisMonth = await Company.countDocuments({
      assignedCA: caId,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    // Get recent activities (last 10)
    const recentActivitiesData = await Analysis.find({ company: { $in: companyIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('company', 'name')
      .select('analysisId company status createdAt completedAt')
      .lean();

    // Format activities
    const recentActivities = recentActivitiesData.map(analysis => ({
      type: 'analysis',
      action: analysis.status === 'completed' ? 'Analysis completed' :
              analysis.status === 'failed' ? 'Analysis failed' :
              'Analysis processing',
      company: analysis.company?.name || 'Unknown',
      timestamp: analysis.createdAt,
      status: analysis.status,
      analysisId: analysis.analysisId
    }));

    // Get companies with stats
    const companiesWithStats = await Promise.all(
      assignedCompanies.map(async (company) => {
        const [analysisCount, documentCount, lastAnalysis] = await Promise.all([
          Analysis.countDocuments({ company: company._id }),
          Document.countDocuments({ company: company._id }),
          Analysis.findOne({ company: company._id })
            .sort({ createdAt: -1 })
            .select('createdAt status')
            .lean()
        ]);

        return {
          _id: company._id,
          name: company.name,
          industry: company.industry,
          totalAnalyses: analysisCount,
          totalDocuments: documentCount,
          lastAnalysisDate: lastAnalysis?.createdAt || null,
          lastAnalysisStatus: lastAnalysis?.status || null,
          daysSinceLastActivity: lastAnalysis ?
            Math.floor((Date.now() - new Date(lastAnalysis.createdAt).getTime()) / (1000 * 60 * 60 * 24)) :
            null
        };
      })
    );

    // Identify companies needing attention (no activity in 30 days or failed analyses)
    const companiesNeedingAttention = companiesWithStats.filter(company =>
      !company.lastAnalysisDate ||
      company.daysSinceLastActivity > 30 ||
      company.lastAnalysisStatus === 'failed'
    );

    // Calculate success rate
    const successRate = totalAnalyses > 0
      ? Math.round((completedAnalyses / totalAnalyses) * 100)
      : 0;

    // Get analysis trend (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const analysisTrend = await Analysis.aggregate([
      {
        $match: {
          company: { $in: companyIds },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          assignedCompanies: assignedCompanies.length,
          newCompaniesThisMonth,
          totalAnalyses,
          recentAnalyses,
          totalDocuments,
          recentDocuments,
          analysisStatus: {
            completed: completedAnalyses,
            processing: processingAnalyses,
            failed: failedAnalyses
          },
          successRate
        },
        recentActivities,
        companies: companiesWithStats,
        companiesNeedingAttention,
        analysisTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCADashboard
};
