import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Notification } from "../models/notificationSchema.js";

export const getMyNotifications = catchAsyncErrors(async (req, res) => {
  const { limit = 30, skip = 0 } = req.query;
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .skip(Number(skip) || 0);

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

  res.status(200).json({ success: true, notifications, unreadCount });
});

export const markNotificationRead = catchAsyncErrors(async (req, res, next) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) return next(new ErrorHandler("Notification not found!", 404));
  n.isRead = true;
  await n.save();
  res.status(200).json({ success: true, message: "Marked as read" });
});

export const markAllRead = catchAsyncErrors(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.status(200).json({ success: true, message: "All notifications marked as read" });
});
