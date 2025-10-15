const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['SUPER_ADMIN', 'CA', 'COMPANY_ADMIN', 'COMPANY_USER'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      // Required for company-level users
      validate: {
        validator: function (value) {
          if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(this.role)) {
            return value != null;
          }
          return true;
        },
        message: 'Company is required for company-level users',
      },
    },
    invitedCompanies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Check if user has permission for a company
userSchema.methods.hasCompanyAccess = function (companyId) {
  if (this.role === 'SUPER_ADMIN') return true;
  if (this.role === 'CA') {
    return this.invitedCompanies.some(
      (company) => company.toString() === companyId.toString()
    );
  }
  if (['COMPANY_ADMIN', 'COMPANY_USER'].includes(this.role)) {
    return this.company && this.company.toString() === companyId.toString();
  }
  return false;
};

// Remove sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
