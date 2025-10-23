const Company = require('../models/Company');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new company (Super Admin only)
 */
const createCompany = async (req, res, next) => {
  try {
    const { name, representative, description, registrationNumber, address, contactInfo } = req.body;

    // Check if representative exists and is eligible
    const repUser = await User.findById(representative);
    if (!repUser) {
      return next(new AppError('Representative user not found', 404));
    }

    if (repUser.role !== 'COMPANY_ADMIN' && repUser.role !== 'COMPANY_USER') {
      return next(new AppError('Representative must be a company admin or company user', 400));
    }

    // Check if company name already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return next(new AppError('Company with this name already exists', 400));
    }

    // Create company
    const company = await Company.create({
      name,
      representative,
      description,
      registrationNumber,
      address,
      contactInfo,
      createdBy: req.user._id,
    });

    // Update representative's company field
    repUser.company = company._id;
    await repUser.save();

    const populatedCompany = await Company.findById(company._id)
      .populate('representative', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: { company: populatedCompany },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all companies
 */
const getAllCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {};

    // If not super admin, filter by user's accessible companies
    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'CA') {
        query['invitedCAs.ca'] = req.user._id;
      } else if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(req.user.role)) {
        query._id = req.user.company;
      }
    }

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const companies = await Company.find(query)
      .populate('representative', 'name email')
      .populate('companyAdmins', 'name email')
      .populate('createdBy', 'name email')
      .populate('assignedCA', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Company.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        companies,
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
 * Get company by ID
 */
const getCompanyById = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate('representative', 'name email role')
      .populate('companyAdmins', 'name email role')
      .populate('invitedCAs.ca', 'name email')
      .populate('invitedCAs.invitedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { company },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update company
 */
const updateCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates.representative;
    delete updates.createdBy;
    delete updates.invitedCAs;
    delete updates.companyAdmins;

    const company = await Company.findByIdAndUpdate(
      companyId,
      updates,
      { new: true, runValidators: true }
    ).populate('representative', 'name email');

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: { company },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete company
 */
const deleteCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findByIdAndDelete(companyId);

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    // Update all users associated with this company
    await User.updateMany(
      { company: companyId },
      { $set: { company: null, isActive: false } }
    );

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invite CA to company
 */
const inviteCA = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { caId } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    const ca = await User.findById(caId);
    if (!ca) {
      return next(new AppError('CA user not found', 404));
    }

    if (ca.role !== 'CA') {
      return next(new AppError('User is not a CA', 400));
    }

    // Check if already invited
    const alreadyInvited = company.invitedCAs.some(
      (invite) => invite.ca.toString() === caId
    );

    if (alreadyInvited) {
      return next(new AppError('CA is already invited to this company', 400));
    }

    // Invite CA
    company.inviteCA(caId, req.user._id);
    await company.save();

    // Add company to CA's invitedCompanies
    if (!ca.invitedCompanies.includes(companyId)) {
      ca.invitedCompanies.push(companyId);
      await ca.save();
    }

    const updatedCompany = await Company.findById(companyId)
      .populate('invitedCAs.ca', 'name email')
      .populate('invitedCAs.invitedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'CA invited successfully',
      data: { company: updatedCompany },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove CA from company
 */
const removeCA = async (req, res, next) => {
  try {
    const { companyId, caId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    const ca = await User.findById(caId);
    if (!ca) {
      return next(new AppError('CA user not found', 404));
    }

    // Remove CA from company
    company.removeCA(caId);
    await company.save();

    // Remove company from CA's invitedCompanies
    ca.invitedCompanies = ca.invitedCompanies.filter(
      (compId) => compId.toString() !== companyId
    );
    await ca.save();

    res.status(200).json({
      success: true,
      message: 'CA removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add company admin
 */
const addCompanyAdmin = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role !== 'COMPANY_ADMIN') {
      return next(new AppError('User must have COMPANY_ADMIN role', 400));
    }

    if (user.company && user.company.toString() !== companyId) {
      return next(new AppError('User is already assigned to another company', 400));
    }

    // Check if already admin
    if (company.companyAdmins.includes(userId)) {
      return next(new AppError('User is already a company admin', 400));
    }

    company.companyAdmins.push(userId);
    await company.save();

    // Update user's company
    user.company = companyId;
    await user.save();

    const updatedCompany = await Company.findById(companyId)
      .populate('companyAdmins', 'name email');

    res.status(200).json({
      success: true,
      message: 'Company admin added successfully',
      data: { company: updatedCompany },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove company admin
 */
const removeCompanyAdmin = async (req, res, next) => {
  try {
    const { companyId, userId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    company.companyAdmins = company.companyAdmins.filter(
      (adminId) => adminId.toString() !== userId
    );
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company admin removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  inviteCA,
  removeCA,
  addCompanyAdmin,
  removeCompanyAdmin,
};
