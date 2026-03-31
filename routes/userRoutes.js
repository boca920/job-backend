import express from "express";
import {
  login,
  register,
  logout,
  getUser,
  forgotPassword,
  resetPassword,
  resetPasswordOtp,
  requestOtp,
  verifyOtp,
  updateProfile,
  updatePassword,
  // NEW:
  updateAvatar,
  uploadResume,
  updateSkills,
  deleteAccount,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import upload  from "../middlewares/multer.js"; // <- Multer (memoryStorage أو حسب إعدادك)

const router = express.Router();

/* ========== Auth Routes ========== */
router.post("/register", register);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);

// علشان الواجهة الحالية بتستخدم /getuser (تقدر تضيف alias /me لو حابب)
router.get("/getuser", isAuthenticated, getUser);

/* ========== OTP (Optional Email Verification) ========== */
router.post("/otp/request", isAuthenticated, requestOtp);
router.post("/otp/verify", isAuthenticated, verifyOtp);
// router.get("/me", isAuthenticated, getUser);

/* ========== Password Recovery ========== */
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPasswordOtp);
router.put("/reset-password/:token", resetPassword);

/* ========== Profile Management ========== */
router.put("/update-profile", isAuthenticated, updateProfile);
router.put("/update-password", isAuthenticated, updatePassword);

// NEW: Update Avatar (expects FormData field: "avatar")
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("avatar"),
  updateAvatar
);

// NEW: Upload/Replace Resume (expects FormData field: "resume")
router.put(
  "/upload-resume",
  isAuthenticated,
  upload.single("resume"),
  uploadResume
);

// NEW: Update Skills (expects { skills: string[] } أو نص comma-separated)
router.put("/update-skills", isAuthenticated, updateSkills);

// NEW: Delete Account
router.delete("/delete-account", isAuthenticated, deleteAccount);

export default router;
