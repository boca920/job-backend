// backend/utils/cloudinary.js — بديل محلي كامل
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// جذر الملفات التي يقدّمها السيرفر: app.use("/uploads", express.static(...))
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// ربط mimetype بالامتداد
const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function inferExt({ mimetype, originalname } = {}) {
  if (mimetype && EXT_BY_MIME[mimetype]) return EXT_BY_MIME[mimetype];
  const ext = (originalname && path.extname(originalname))?.toLowerCase();
  return ext || ".bin";
}

function uniqueName(ext) {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

/**
 * رفع من Buffer (للـ memoryStorage)
 * opts: { mimetype?, originalname? }
 */
export async function uploadBuffer(buffer, folder = "misc", opts = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("uploadBuffer: invalid buffer");
  }
  const ext = inferExt(opts);
  const dir = path.join(UPLOAD_ROOT, folder);
  ensureDir(dir);

  const filename = uniqueName(ext);
  const filePath = path.join(dir, filename);

  await fs.promises.writeFile(filePath, buffer);

  const public_id = `${folder}/${filename}`;
  const secure_url = `/uploads/${public_id}`;
  return { secure_url, public_id };
}

/**
 * رفع من مسار ملف (للـ diskStorage)
 * opts: { originalname? }
 */
export async function uploadLocalPath(srcPath, folder = "misc", opts = {}) {
  if (!srcPath) throw new Error("uploadLocalPath: srcPath required");

  const ext = inferExt({ originalname: opts.originalname || srcPath });
  const dir = path.join(UPLOAD_ROOT, folder);
  ensureDir(dir);

  const filename = uniqueName(ext);
  const destPath = path.join(dir, filename);

  // ننسخ بدلاً من النقل (أأمن للتعامل مع tmp)
  await fs.promises.copyFile(srcPath, destPath);

  const public_id = `${folder}/${filename}`;
  const secure_url = `/uploads/${public_id}`;
  return { secure_url, public_id };
}

/**
 * حذف ملف محلي بناءً على public_id أو URL
 * أمثلة مقبولة:
 *  - "avatars/123-abc.jpg"
 *  - "/uploads/avatars/123-abc.jpg"
 *  - (توافق قديم) "local_avatars_123-abc.jpg"
 */
export async function destroyById(id) {
  if (!id) return;
  let rel;

  if (id.startsWith("/uploads/")) {
    rel = id.replace(/^\/uploads\//, "");
  } else if (id.startsWith("local_")) {
    const parts = id.split("_");
    if (parts.length >= 3) {
      const folder = parts[1];
      const filename = parts.slice(2).join("_");
      rel = `${folder}/${filename}`;
    }
  } else {
    rel = id; // اعتبره relative
  }

  if (!rel) return;

  const abs = path.join(UPLOAD_ROOT, rel);
  // حماية بسيطة: تأكد أنه داخل UPLOAD_ROOT
  if (!abs.startsWith(UPLOAD_ROOT)) return;

  await fs.promises.unlink(abs).catch(() => {});
}

export default { uploadBuffer, uploadLocalPath, destroyById };
