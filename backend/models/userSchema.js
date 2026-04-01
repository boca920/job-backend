import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/* ==================== Helpers for skills ==================== */
const MAX_SKILLS_COUNT = 50;
const MAX_SKILL_LENGTH = 50;

function normalizeSkillText(txt) {
  if (txt == null) return "";
  return String(txt).trim().replace(/\s+/g, " ");
}

function splitSkillsFlexible(input) {
  // تقسيم على فاصلة / سيمي-كولن / سطر جديد / | / تاب
  return String(input)
    .split(/[\n,;|\t]+/g)
    .map(normalizeSkillText)
    .filter(Boolean);
}

/** يحوّل أي إدخال (مصفوفة أو نص) إلى قائمة مهارات نظيفة وبدون تكرار */
function coerceSkills(value) {
  let list = [];

  if (Array.isArray(value)) {
    list = value.map(normalizeSkillText).filter(Boolean);
  } else if (typeof value === "string") {
    const s = value.trim();
    // لو جاية كـ JSON Array داخل سترنج
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          list = parsed.map(normalizeSkillText).filter(Boolean);
        } else {
          list = splitSkillsFlexible(s);
        }
      } catch {
        list = splitSkillsFlexible(s);
      }
    } else {
      list = splitSkillsFlexible(s);
    }
  } else if (value != null) {
    // أرقام/قِيَم أخرى
    list = [normalizeSkillText(value)];
  }

  // إزالة التكرارات (Case-insensitive)
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const clean = normalizeSkillText(item);
    if (!clean) continue;
    if (clean.length > MAX_SKILL_LENGTH) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_SKILLS_COUNT) break;
  }
  return out;
}

/* ==================== Subdocument for uploaded assets ==================== */
const assetSchema = new mongoose.Schema(
  {
    url: { type: String },
    public_id: { type: String },
  },
  { _id: false }
);

/* ==================== User Schema ==================== */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your Name!"],
      minLength: [3, "Name must contain at least 3 Characters!"],
      maxLength: [30, "Name cannot exceed 30 Characters!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter your Email!"],
      validate: [validator.isEmail, "Please provide a valid Email!"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // نخلي الهاتف نص علشان يحتفظ بالأصفار و + -
    phone: {
      type: String,
      required: [true, "Please enter your Phone Number!"],
      trim: true,
      validate: {
        // ملاحظة: تم إصلاح الـ RegExp ليكون [\s()+-] وليس \\s
        validator: (v) =>
          typeof v === "string" && v.replace(/[\s()+-]/g, "").length >= 7,
        message: "Please provide a valid Phone Number!",
      },
    },
    password: {
      type: String,
      required: [true, "Please provide a Password!"],
      minLength: [8, "Password must contain at least 8 characters!"],
      maxLength: [32, "Password cannot exceed 32 characters!"],
      select: false,
    },
    role: {
      type: String,
      required: [true, "Please select a role"],
      enum: ["Job Seeker", "Employer"],
      default: "Job Seeker",
    },

    avatar: {
      type: assetSchema, // { url, public_id }
      default: {},
    },
    resume: {
      type: assetSchema, // { url, public_id }
      default: {},
    },

    /* ===== Skills with flexible input (array or single text) ===== */
    skills: {
      type: [String],
      default: [],
      set: coerceSkills, // هنا السحر: يقبل نص/مصفوفة ويحولها لقائمة نظيفة
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length <= MAX_SKILLS_COUNT &&
          arr.every((s) => typeof s === "string" && s.length <= MAX_SKILL_LENGTH),
        message:
          "Skills must be an array of strings (max 50 items, each up to 50 chars).",
      },
    },

    // Reset password fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // NEW: Reset password via OTP
    resetOtpHash: String,
    resetOtpExpire: Date,

    // OTP verification (optional)
    otpCodeHash: String,
    otpExpire: Date,
    otpVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

/* ==================== Hooks & Methods ==================== */
// Encrypt password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken;
};

// Hide sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model("User", userSchema);
