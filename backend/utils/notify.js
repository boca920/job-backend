import { Notification } from "../models/notificationSchema.js";

/**
 * Create a notification safely (never throws to callers).
 */
export async function createNotification({ user, title, message, type = "SYSTEM", meta = {} }) {
  try {
    if (!user) return null;
    return await Notification.create({ user, title, message, type, meta });
  } catch (e) {
    // don't break main flow
    console.error("[createNotification]", e?.message || e);
    return null;
  }
}
