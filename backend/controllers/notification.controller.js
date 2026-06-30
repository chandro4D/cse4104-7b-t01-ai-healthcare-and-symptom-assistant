const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification.model");

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, data: notifications });
});

const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res
    .status(200)
    .json({ success: true, message: "Notification marked as read." });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true },
  );
  res
    .status(200)
    .json({ success: true, message: "All notifications marked as read." });
});

const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: "Notification deleted." });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
