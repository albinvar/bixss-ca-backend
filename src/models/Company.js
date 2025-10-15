const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    contactInfo: {
      phone: String,
      email: String,
      website: String,
    },
    representative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company representative is required'],
    },
    companyAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitedCAs: [
      {
        ca: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for performance
companySchema.index({ name: 1 });
companySchema.index({ representative: 1 });
companySchema.index({ createdBy: 1 });

// Virtual for all users (admins + representative)
companySchema.virtual('allAdmins').get(function () {
  return [this.representative, ...this.companyAdmins];
});

// Method to check if a user is an admin of this company
companySchema.methods.isCompanyAdmin = function (userId) {
  return (
    this.representative.toString() === userId.toString() ||
    this.companyAdmins.some((admin) => admin.toString() === userId.toString())
  );
};

// Method to add CA to company
companySchema.methods.inviteCA = function (caId, invitedByUserId) {
  const alreadyInvited = this.invitedCAs.some(
    (invite) => invite.ca.toString() === caId.toString()
  );

  if (!alreadyInvited) {
    this.invitedCAs.push({
      ca: caId,
      invitedBy: invitedByUserId,
      invitedAt: new Date(),
    });
  }
};

// Method to remove CA from company
companySchema.methods.removeCA = function (caId) {
  this.invitedCAs = this.invitedCAs.filter(
    (invite) => invite.ca.toString() !== caId.toString()
  );
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
