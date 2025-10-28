const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'client_added',
      'document_uploaded',
      'analysis_completed',
      'analysis_failed',
      'compliance_deadline',
      'payment_received',
      'report_generated',
      'company_assigned',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String, // URL to navigate when notification is clicked
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Additional data (companyId, analysisId, etc.)
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  return await this.create(data);
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return await this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
