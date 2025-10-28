const Notification = require('../models/Notification');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, unreadOnly = false } = req.query;

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false
    });

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.markAsRead(notificationId, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: {
        notification
      }
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Helper function to create notifications (used by other controllers)
 */
exports.createNotification = async (userId, data) => {
  try {
    return await Notification.createNotification({
      user: userId,
      ...data
    });
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};
