// backend/middlewares/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// جذر الرفع: backend/uploads
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

// تحديد المجلد الفرعي حسب اسم الحقل
const resolveSubfolder = (fieldname) => {
  if (fieldname === "avatar") return "avatars";
  if (fieldname === "resume") return "resumes";
  return "misc";
};

// توليد اسم ملف نظيف وفريد
const makeSafeFilename = (fieldname, originalname) => {
  const base = path.basename(originalname, path.extname(originalname));
  const safeBase = base.toLowerCase().replace(/[^a-z0-9-_]+/gi, "-").slice(0, 50);
  const ext = path.extname(originalname).toLowerCase();
  const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${fieldname}-${safeBase}-${unique}${ext}`;
};

// تخزين على القرص
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = resolveSubfolder(file.fieldname);
    const dest = path.join(UPLOADS_ROOT, sub);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, makeSafeFilename(file.fieldname, file.originalname));
  },
});

// أنواع مسموحة
const IMG_EXT_RE = /\.(jpe?g|png|webp)$/i;
const isImage = (ext, mime) => IMG_EXT_RE.test(ext) && /^image\//i.test(mime);
const isPdf   = (ext, mime) => /\.pdf$/i.test(ext) && mime === "application/pdf";

// فلتر الأنواع حسب الحقل
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (file.fieldname === "avatar") {
    if (isImage(ext, mime)) return cb(null, true);
    return cb(new Error("Avatar must be an image (jpeg, jpg, png, webp)."));
  }

  if (file.fieldname === "resume") {
    if (isPdf(ext, mime) || isImage(ext, mime)) return cb(null, true);
    return cb(new Error("Resume must be a PDF or image (jpeg, jpg, png, webp)."));
  }

  // حقول أخرى: اسمح بصور أو PDF فقط
  if (isPdf(ext, mime) || isImage(ext, mime)) return cb(null, true);
  return cb(new Error("Only images (jpeg, jpg, png, webp) or PDF are allowed."));
};

// إعداد الملتِر
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

/* ======= Exports جاهزة تربطها في الراوتر ======= */
// لرفع صورة البروفايل: router.put("/user/update-avatar", isAuth, uploadAvatar, controller)
export const uploadAvatar = upload.single("avatar");
// لرفع/استبدال السيرة الذاتية: router.put("/user/upload-resume", isAuth, uploadResume, controller)
export const uploadResume = upload.single("resume");
// لو محتاج تستخدمه لحقول مختلفة
export const uploadAny = upload.any();

/* ======= وسيط لمعالجة أخطاء Multer بشكل JSON ======= */
export const onMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // أخطاء الحجم/العدد..إلخ
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Max 10MB."
        : err.message || "Upload error.";
    return res.status(400).json({ success: false, message: msg });
  }
  if (err && err.message && (
      /Avatar must be/i.test(err.message) ||
      /Resume must be/i.test(err.message) ||
      /Only images/i.test(err.message)
    )) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
};

export default upload;
