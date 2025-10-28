const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/notifications
// @desc    Get all notifications for current user
router.get('/', notificationController.getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
