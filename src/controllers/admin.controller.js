const User = require('../models/User');
const Company = require('../models/Company');
const Analysis = require('../models/Analysis');
const Document = require('../models/Document');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get comprehensive admin dashboard analytics
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    // Get counts
    const [
      totalCompanies,
      totalCAs,
      totalAnalyses,
      totalDocuments,
      activeCompanies,
      inactiveCompanies,
      activeCAs,
      inactiveCAs,
      recentAnalyses,
      recentCompanies
    ] = await Promise.all([
      Company.countDocuments(),
      User.countDocuments({ role: 'CA' }),
      Analysis.countDocuments(),
      Document.countDocuments(),
      Company.countDocuments({ status: 'active' }),
      Company.countDocuments({ status: 'inactive' }),
      User.countDocuments({ role: 'CA', isActive: true }),
      User.countDocuments({ role: 'CA', isActive: false }),
      Analysis.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      Company.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Calculate analytics by time periods
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get analyses growth
    const analysesLast30Days = await Analysis.countDocuments({ createdAt: { $gte: last30Days } });
    const analysesLast7Days = await Analysis.countDocuments({ createdAt: { $gte: last7Days } });

    // Get companies by industry
    const companiesByIndustry = await Company.aggregate([
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get top active CAs (by number of assigned companies)
    const topCAs = await User.aggregate([
      { $match: { role: 'CA', isActive: true } },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: 'assignedCA',
          as: 'assignedCompanies'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          companyCount: { $size: '$assignedCompanies' },
          createdAt: 1
        }
      },
      { $sort: { companyCount: -1 } },
      { $limit: 10 }
    ]);

    // Get recent activities
    const recentActivities = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('company', 'name')
      .populate('uploadedBy', 'name role')
      .select('analysisId company uploadedBy createdAt status');

    // System health metrics
    const systemHealth = {
      totalStorage: 0, // TODO: Calculate from documents
      activeUsers: await User.countDocuments({ isActive: true }),
      pendingAnalyses: await Analysis.countDocuments({ status: 'processing' }),
      failedAnalyses: await Analysis.countDocuments({ status: 'failed' })
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCompanies,
          totalCAs,
          totalAnalyses,
          totalDocuments,
          activeCompanies,
          inactiveCompanies,
          activeCAs,
          inactiveCAs,
          recentAnalyses,
          recentCompanies
        },
        growth: {
          analysesLast30Days,
          analysesLast7Days,
          companiesLast30Days: recentCompanies
        },
        companiesByIndustry,
        topCAs,
        recentActivities,
        systemHealth
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all CAs with their statistics
 */
const getAllCAs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    const query = { role: 'CA' };

    // Filter by active status
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const cas = await User.find(query)
      .populate('invitedCompanies', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with company count
    const enrichedCAs = await Promise.all(
      cas.map(async (ca) => {
        const assignedCompanies = await Company.countDocuments({ assignedCA: ca._id });
        const totalAnalyses = await Analysis.countDocuments({ uploadedBy: ca._id });

        return {
          ...ca,
          stats: {
            assignedCompanies,
            invitedCompanies: ca.invitedCompanies?.length || 0,
            totalAnalyses
          }
        };
      })
    );

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        cas: enrichedCAs,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new CA
 */
const createCA = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      caLicenseNumber,
      registrationYear,
      firm,
      specialization,
      yearsOfExperience,
      address
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return next(new AppError('Name, email, and password are required', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Create CA user with all professional details
    const ca = await User.create({
      name,
      email,
      password,
      role: 'CA',
      phone,
      caLicenseNumber,
      registrationYear,
      firm,
      specialization: Array.isArray(specialization) ? specialization : [],
      yearsOfExperience,
      address: address || {},
      profileComplete: !!(phone && caLicenseNumber && firm), // Mark complete if key fields provided
      isActive: true,
      emailVerified: false
    });

    // Remove password from response
    const caResponse = ca.toObject();
    delete caResponse.password;

    res.status(201).json({
      success: true,
      message: 'CA created successfully',
      data: { ca: caResponse }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update CA
 */
const updateCA = async (req, res, next) => {
  try {
    const { caId } = req.params;
    const updates = req.body;

    // Don't allow updating sensitive fields
    delete updates.password;
    delete updates.refreshToken;
    delete updates.role;

    const ca = await User.findOneAndUpdate(
      { _id: caId, role: 'CA' },
      updates,
      { new: true, runValidators: true }
    ).populate('invitedCompanies', 'name');

    if (!ca) {
      return next(new AppError('CA not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'CA updated successfully',
      data: { ca }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete CA
 */
const deleteCA = async (req, res, next) => {
  try {
    const { caId } = req.params;

    const ca = await User.findOne({ _id: caId, role: 'CA' });

    if (!ca) {
      return next(new AppError('CA not found', 404));
    }

    // Check if CA is assigned to any companies
    const assignedCompanies = await Company.countDocuments({ assignedCA: caId });

    if (assignedCompanies > 0) {
      return next(new AppError(
        `Cannot delete CA. They are currently assigned to ${assignedCompanies} company/companies. Please reassign or remove the assignments first.`,
        400
      ));
    }

    await ca.deleteOne();

    res.status(200).json({
      success: true,
      message: 'CA deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign CA to companies
 */
const assignCAToCompanies = async (req, res, next) => {
  try {
    const { caId } = req.params;
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return next(new AppError('Company IDs array is required', 400));
    }

    const ca = await User.findOne({ _id: caId, role: 'CA' });

    if (!ca) {
      return next(new AppError('CA not found', 404));
    }

    // Verify all companies exist
    const companies = await Company.find({ _id: { $in: companyIds } });

    if (companies.length !== companyIds.length) {
      return next(new AppError('One or more companies not found', 404));
    }

    // Update CA's invited companies
    ca.invitedCompanies = [...new Set([...ca.invitedCompanies, ...companyIds])];
    await ca.save();

    // Update companies' assigned CA
    await Company.updateMany(
      { _id: { $in: companyIds } },
      { $set: { assignedCA: caId } }
    );

    res.status(200).json({
      success: true,
      message: `CA assigned to ${companyIds.length} company/companies successfully`,
      data: { ca: await ca.populate('invitedCompanies', 'name') }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove CA from companies
 */
const removeCAFromCompanies = async (req, res, next) => {
  try {
    const { caId } = req.params;
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return next(new AppError('Company IDs array is required', 400));
    }

    const ca = await User.findOne({ _id: caId, role: 'CA' });

    if (!ca) {
      return next(new AppError('CA not found', 404));
    }

    // Remove companies from CA's invited list
    ca.invitedCompanies = ca.invitedCompanies.filter(
      companyId => !companyIds.includes(companyId.toString())
    );
    await ca.save();

    // Remove CA assignment from companies
    await Company.updateMany(
      { _id: { $in: companyIds }, assignedCA: caId },
      { $unset: { assignedCA: 1 } }
    );

    res.status(200).json({
      success: true,
      message: `CA removed from ${companyIds.length} company/companies successfully`,
      data: { ca: await ca.populate('invitedCompanies', 'name') }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get CA details with full statistics
 */
const getCADetails = async (req, res, next) => {
  try {
    const { caId } = req.params;

    const ca = await User.findOne({ _id: caId, role: 'CA' })
      .populate('invitedCompanies', 'name industry status')
      .lean();

    if (!ca) {
      return next(new AppError('CA not found', 404));
    }

    // Get assigned companies (where this CA is the primary assignedCA)
    const assignedCompanies = await Company.find({ assignedCA: caId })
      .select('name industry status')
      .lean();

    // Get analyses created by this CA
    const analyses = await Analysis.find({ uploadedBy: caId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('company', 'name')
      .select('analysisId company createdAt status');

    const totalAnalyses = await Analysis.countDocuments({ uploadedBy: caId });
    const recentAnalyses = await Analysis.countDocuments({
      uploadedBy: caId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      success: true,
      data: {
        ca,
        assignedCompanies,
        invitedCompanies: ca.invitedCompanies || [],
        stats: {
          totalAssignedCompanies: assignedCompanies.length,
          totalInvitedCompanies: ca.invitedCompanies?.length || 0,
          totalAnalyses,
          recentAnalyses
        },
        recentAnalyses: analyses
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getAllCAs,
  createCA,
  updateCA,
  deleteCA,
  assignCAToCompanies,
  removeCAFromCompanies,
  getCADetails
};
