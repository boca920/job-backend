import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: [
        "SYSTEM",
        "APPLICATION_NEW",
        "APPLICATION_STATUS",
        "INTERVIEW_SCHEDULED",
        "OTP",
      ],
      default: "SYSTEM",
    },
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
