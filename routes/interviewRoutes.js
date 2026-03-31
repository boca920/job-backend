import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { scheduleInterview, getMyInterviews, cancelInterview } from "../controllers/interviewController.js";

const router = express.Router();

router.get("/my", isAuthenticated, getMyInterviews);
router.post("/schedule", isAuthenticated, scheduleInterview);
router.patch("/cancel/:id", isAuthenticated, cancelInterview);

export default router;
