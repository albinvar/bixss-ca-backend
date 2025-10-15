const Company = require('../models/Company');

/**
 * Middleware to check if user has required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is a super admin
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
  }
  next();
};

/**
 * Middleware to check if user is a CA
 */
const isCA = (req, res, next) => {
  if (!req.user || req.user.role !== 'CA') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. CA privileges required.',
    });
  }
  next();
};

/**
 * Middleware to check if user has access to a specific company
 */
const hasCompanyAccess = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.',
      });
    }

    // Super admin has access to all companies
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has access to this company
    if (req.user.hasCompanyAccess(companyId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have access to this company.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking company access.',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user is an admin of a specific company
 */
const isCompanyAdmin = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.',
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user is company admin
    if (req.user.role === 'COMPANY_ADMIN') {
      if (req.user.company && req.user.company.toString() === companyId) {
        return next();
      }
    }

    // Also check in company document
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found.',
      });
    }

    if (company.isCompanyAdmin(req.user._id)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Company admin privileges required.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking company admin status.',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if CA has access to a specific company
 */
const caHasCompanyAccess = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.',
      });
    }

    // Must be a CA
    if (req.user.role !== 'CA') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. CA privileges required.',
      });
    }

    // Check if CA is invited to this company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found.',
      });
    }

    const isInvited = company.invitedCAs.some(
      (invite) => invite.ca.toString() === req.user._id.toString()
    );

    if (!isInvited) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not invited to this company.',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking CA access.',
      error: error.message,
    });
  }
};

module.exports = {
  authorize,
  isSuperAdmin,
  isCA,
  hasCompanyAccess,
  isCompanyAdmin,
  caHasCompanyAccess,
};
