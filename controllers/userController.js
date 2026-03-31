import crypto from "crypto";
import path from "path";
import fs from "fs";
import cloudinary from "cloudinary";

import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "../utils/notify.js";
// اختياري: لو عندك util لرفع من buffer / حذف بالـ public_id. وجودها لا يضر حتى لو لم تُستخدم.
import { uploadBuffer, destroyById } from "../utils/cloudinary.js";

/* ==================== Helpers ==================== */
const cloudEnabled =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const safeUnlink = (p) => p && fs.promises.unlink(p).catch(() => {});

/* ---- Skills helpers ---- */
const MAX_SKILLS_COUNT = 50;
const MAX_SKILL_LENGTH = 50;

function normalizeSkillText(txt) {
  if (txt == null) return "";
  return String(txt).trim().replace(/\s+/g, " ");
}

function splitSkillsFlexible(input) {
  // يقسم على فاصلة/سطر جديد/سيمي-كولن/تاب
  return String(input)
    .split(/[\n,;|\t]+/g)
    .map(normalizeSkillText)
    .filter(Boolean);
}

/**
 * تقبل أشكال مختلفة:
 * - مصفوفة (مباشرة أو skills[])
 * - نص مفصول بفواصل/أسطر
 * - سترنج JSON: '["React","Node"]'
 */
function extractSkillsFromBody(body) {
  let raw =
    body?.skills !== undefined
      ? body.skills
      : body?.["skills[]"] !== undefined
      ? body["skills[]"]
      : undefined;

  // حالة skills[] من multipart قد تكون Array بالفعل
  if (Array.isArray(raw)) {
    return raw.map(normalizeSkillText).filter(Boolean);
  }

  // أحيانًا تأتي كأرقام أو قيم أخرى
  if (typeof raw === "number" || typeof raw === "boolean") {
    return [normalizeSkillText(raw)];
  }

  if (typeof raw === "string") {
    const s = raw.trim();

    // لو شكل JSON Array سترنج
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeSkillText).filter(Boolean);
        }
      } catch {
        // تجاهل ونكمّل كـ نص مفصول
      }
    }

    // نص مفصول بفواصل/أسطر
    return splitSkillsFlexible(s);
  }

  // fallback: لو مفيش skills، نجرب نجمع أي مفاتيح شبيهة
  const candidates = [];
  for (const [k, v] of Object.entries(body || {})) {
    if (/^skills\[\d+\]$/.test(k)) {
      candidates.push(normalizeSkillText(v));
    }
  }
  return candidates.filter(Boolean);
}

function sanitizeSkills(skills) {
  const out = [];
  const seen = new Set();
  for (const item of skills) {
    const s = normalizeSkillText(item);
    if (!s) continue;
    if (s.length > MAX_SKILL_LENGTH) continue;
    if (seen.has(s.toLowerCase())) continue; // منع تكرار بحساسية حالة الأحرف
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= MAX_SKILLS_COUNT) break;
  }
  return out;
}

/* ==================== REGISTER ==================== */
export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return next(new ErrorHandler("Please fill the full form!", 400));
  }

  const isEmail = await User.findOne({ email });
  if (isEmail) {
    return next(new ErrorHandler("Email already registered!", 400));
  }

  const user = await User.create({ name, email, phone, password, role });
  sendToken(user, 201, res, "User Registered Successfully!");
});

/* ==================== LOGIN ==================== */
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return next(
      new ErrorHandler("Please provide email, password, and role!", 400)
    );
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid Email or Password!", 400));

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched)
    return next(new ErrorHandler("Invalid Email or Password!", 400));

  if (user.role !== role)
    return next(new ErrorHandler(`User with role ${role} not found!`, 404));

  sendToken(user, 200, res, "User Logged In Successfully!");
});

/* ==================== LOGOUT ==================== */
export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
      sameSite: "lax",
      secure: false, // true في الإنتاج مع HTTPS
    })
    .json({ success: true, message: "Logged Out Successfully!" });
});

/* ==================== GET USER (ME) ==================== */
export const getUser = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  res.status(200).json({ success: true, user });
});

/* ==================== FORGOT PASSWORD ==================== */
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return next(new ErrorHandler("User not found with this email!", 404));

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  user.resetOtpHash = otpHash;
  user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save({ validateBeforeSave: false });

  const message = `You requested a password reset.

Your OTP code is: ${otp}

This code expires in 10 minutes.
If you didn't request this, please ignore it.`;

  try {
    await sendEmail({ email: user.email, subject: "Password Reset OTP", message });
    res.status(200).json({ success: true, message: `OTP sent to ${user.email}` });
  } catch {
    user.resetOtpHash = undefined;
    user.resetOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("Email could not be sent!", 500));
  }
});

/* ==================== RESET PASSWORD (OTP) ==================== */
export const resetPasswordOtp = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    return next(new ErrorHandler("Please provide email, otp, password and confirmPassword.", 400));
  }
  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match!", 400));
  }

  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found with this email!", 404));

  if (!user.resetOtpHash || !user.resetOtpExpire || user.resetOtpExpire.getTime() < Date.now()) {
    return next(new ErrorHandler("OTP expired. Please request a new one.", 400));
  }

  const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (otpHash !== user.resetOtpHash) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  user.password = password;
  user.resetOtpHash = undefined;
  user.resetOtpExpire = undefined;
  // Also clear legacy token if any
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res, "Password reset successfully!");
});

/* ==================== RESET PASSWORD ==================== */
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler("Invalid or expired password reset token!", 400)
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Passwords do not match!", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res, "Password reset successfully!");
});

/* ==================== OTP (Optional) ==================== */
export const requestOtp = catchAsyncErrors(async (req, res, next) => {
  // requires auth: send OTP to current user's email
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found!", 404));

  // 6-digit numeric OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  user.otpCodeHash = otpHash;
  user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  const message = `Your OTP code is: ${otp}

This code expires in 10 minutes.`;

  try {
    await sendEmail({ email: user.email, subject: "Your OTP code", message });
  } catch {
    user.otpCodeHash = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("OTP email could not be sent!", 500));
  }

  await createNotification({
    user: user._id,
    title: "OTP revealing",
    message: "An OTP code was sent to your email.",
    type: "OTP",
  });

  res.status(200).json({ success: true, message: "OTP sent to your email." });
});

export const verifyOtp = catchAsyncErrors(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return next(new ErrorHandler("OTP is required!", 400));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found!", 404));

  if (!user.otpCodeHash || !user.otpExpire || user.otpExpire.getTime() < Date.now()) {
    return next(new ErrorHandler("OTP expired. Please request a new one.", 400));
  }

  const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (otpHash !== user.otpCodeHash) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  user.otpVerified = true;
  user.otpCodeHash = undefined;
  user.otpExpire = undefined;
  await user.save({ validateBeforeSave: false });

  await createNotification({
    user: user._id,
    title: "Account verified",
    message: "Your account has been verified successfully.",
    type: "OTP",
  });

  res.status(200).json({ success: true, message: "OTP verified." });
});



/* ==================== UPDATE PROFILE ==================== */
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, phone, email } = req.body;

  if (email) {
    const exist = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (exist) return next(new ErrorHandler("Email already in use!", 400));
  }

  const newData = {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
  };

  const user = await User.findByIdAndUpdate(req.user._id, newData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully!",
    user,
  });
});

/* ==================== UPDATE PASSWORD ==================== */
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return next(new ErrorHandler("User not found!", 404));

  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched)
    return next(new ErrorHandler("Old password is incorrect!", 400));

  if (newPassword !== confirmPassword)
    return next(new ErrorHandler("Passwords do not match!", 400));

  if (typeof newPassword !== "string" || newPassword.length < 8)
    return next(new ErrorHandler("Password must be at least 8 characters!", 400));

  user.password = newPassword;
  await user.save();

  sendToken(user, 200, res, "Password updated successfully!");
});

/* ==================== UPDATE AVATAR (disk/memory) ==================== */
// Expecting multer.single("avatar") in route
export const updateAvatar = catchAsyncErrors(async (req, res, next) => {
  if (!req.file) return next(new ErrorHandler("No file provided!", 400));

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(req.file.mimetype)) {
    safeUnlink(req.file.path);
    return next(new ErrorHandler("Avatar must be an image (jpeg/jpg/png/webp).", 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    safeUnlink(req.file.path);
    return next(new ErrorHandler("User not found!", 404));
  }

  try {
    let url = null;
    let public_id = null;

    if (cloudEnabled) {
      // memoryStorage
      if (req.file.buffer) {
        const uploaded = await uploadBuffer(req.file.buffer, "avatars");
        url = uploaded.secure_url;
        public_id = uploaded.public_id;
      }
      // diskStorage
      else if (req.file.path) {
        const uploaded = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "job-portal/avatars",
          resource_type: "image",
          overwrite: true,
          invalidate: true,
        });
        url = uploaded.secure_url;
        public_id = uploaded.public_id;
        safeUnlink(req.file.path);
      } else {
        return next(new ErrorHandler("Unsupported upload source.", 400));
      }

      if (user.avatar?.public_id) {
        // auto كافية للصور؛ غيّر إن لزم resource_type
        cloudinary.v2.uploader.destroy(user.avatar.public_id, { resource_type: "image" }).catch(() => {});
      }
    } else {
      // بدون Cloudinary: استخدم الملف المحلي (diskStorage فقط)
      if (!req.file.path) {
        return next(new ErrorHandler("Local storage requires diskStorage (file.path).", 500));
      }
      const filename = path.basename(req.file.path);
      url = `/uploads/avatars/${filename}`;
      public_id = null;
      // لا نحذف الملف المحلي
    }

    user.avatar = { url, public_id };
    await user.save();

    return res.status(200).json({ success: true, message: "Avatar updated", user });
  } catch (err) {
    console.error("[updateAvatar] error:", err?.message || err);
    return next(new ErrorHandler("Failed to update avatar.", 500));
  }
});

/* ==================== UPLOAD RESUME (disk/memory) ==================== */
// Expecting multer.single("resume") in route
export const uploadResume = catchAsyncErrors(async (req, res, next) => {
  if (!req.file) return next(new ErrorHandler("No file provided!", 400));

  const isPdf = req.file.mimetype === "application/pdf";
  const isImg = /^image\//i.test(req.file.mimetype);
  if (!isPdf && !isImg) {
    safeUnlink(req.file.path);
    return next(new ErrorHandler("Resume must be a PDF or image.", 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    safeUnlink(req.file.path);
    return next(new ErrorHandler("User not found!", 404));
  }

  try {
    let url = null;
    let public_id = null;

    if (cloudEnabled) {
      if (req.file.buffer) {
        const uploaded = await uploadBuffer(req.file.buffer, "resumes"); // يجب أن يدعم resource_type:auto
        url = uploaded.secure_url;
        public_id = uploaded.public_id;
      } else if (req.file.path) {
        const uploaded = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "job-portal/resumes",
          resource_type: "auto", // يدعم pdf والصور
          overwrite: true,
          invalidate: true,
        });
        url = uploaded.secure_url;
        public_id = uploaded.public_id;
        safeUnlink(req.file.path);
      } else {
        return next(new ErrorHandler("Unsupported upload source.", 400));
      }

      if (user.resume?.public_id) {
        cloudinary.v2.uploader
          .destroy(user.resume.public_id, { resource_type: "auto" })
          .catch(() => {});
      }
    } else {
      if (!req.file.path) {
        return next(new ErrorHandler("Local storage requires diskStorage (file.path).", 500));
      }
      const filename = path.basename(req.file.path);
      url = `/uploads/resumes/${filename}`;
      public_id = null;
    }

    user.resume = { url, public_id };
    await user.save();

    return res.status(200).json({ success: true, message: "Resume uploaded", user });
  } catch (err) {
    console.error("[uploadResume] error:", err?.message || err);
    return next(new ErrorHandler("Failed to upload resume.", 500));
  }
});

/* ==================== UPDATE SKILLS (يدعم إدخال متعدد داخل حقل واحد أو مصفوفة) ==================== */
export const updateSkills = catchAsyncErrors(async (req, res, next) => {
  // استخرج أي شكل وارد
  const extracted = extractSkillsFromBody(req.body);
  const sanitized = sanitizeSkills(extracted);

  if (!sanitized.length) {
    return next(
      new ErrorHandler(
        "No valid skills provided. Send an array or a comma/newline separated string.",
        400
      )
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { skills: sanitized },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json({
      success: true,
      message: "Skills updated",
      user,
    });
});

/* ==================== DELETE ACCOUNT ==================== */
export const deleteAccount = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found!", 404));

  try {
    if (user?.avatar?.public_id) {
      cloudinary.v2.uploader.destroy(user.avatar.public_id, { resource_type: "image" }).catch(() => {});
    }
    if (user?.resume?.public_id) {
      cloudinary.v2.uploader.destroy(user.resume.public_id, { resource_type: "auto" }).catch(() => {});
    }
  } catch {
    // تجاهل أخطاء الحذف من Cloudinary
  }

  await User.findByIdAndDelete(user._id);

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });

  return res.status(200).json({ success: true, message: "Account deleted" });
});
