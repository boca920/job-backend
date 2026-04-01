// backend/routes/applicationRoutes.js
import express from "express";
import {
  employerGetAllApplications,
  jobseekerDeleteApplication,
  jobseekerGetAllApplications,
  postApplication,
  updateApplicationStatus,
} from "../controllers/applicationController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

/**
 * إرسال طلب وظيفة
 * مهم: لازم اسم الحقل في الـ FormData يكون "resume"
 * مثال فرونت:
 *   const fd = new FormData();
 *   fd.append("resume", file);
 *   ...
 */
router.post(
  "/post",
  isAuthenticated,
  upload.single("resume"), // <-- هنا إضافة Multer
  postApplication
);

// عرض جميع الطلبات الخاصة بصاحب العمل
router.get("/employer/getall", isAuthenticated, employerGetAllApplications);

// عرض جميع الطلبات الخاصة بمقدم الوظائف
router.get("/jobseeker/getall", isAuthenticated, jobseekerGetAllApplications);

// Alias اختياري علشان توافق مسار الواجهة "/applications/me"
router.get("/me", isAuthenticated, jobseekerGetAllApplications);

// حذف طلب وظيفة
router.delete("/delete/:id", isAuthenticated, jobseekerDeleteApplication);

// تحديث حالة الطلب (قبول / رفض)
router.put("/updatestatus/:id", isAuthenticated, updateApplicationStatus);

export default router;
