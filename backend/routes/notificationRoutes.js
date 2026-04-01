import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getMyNotifications, markAllRead, markNotificationRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/my", isAuthenticated, getMyNotifications);
router.patch("/read/:id", isAuthenticated, markNotificationRead);
router.patch("/read-all", isAuthenticated, markAllRead);

export default router;
