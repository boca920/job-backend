// backend/server.js
import "dotenv/config.js";
import app from "./app.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

/* -------------------- Paths (ESM) -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- Cloudinary Config -------------------- */
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  console.log("[Cloudinary] configured.");
} else {
  console.warn(
    "[Cloudinary] Missing env vars. Skipping Cloudinary config. " +
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET if you plan to use it."
  );
}

/* -------------------- Static Uploads (Local) --------------------
 * يعرّض مجلد uploads/ محليًا لو بتستخدم diskStorage
 * مثال URL: http://localhost:4000/uploads/avatars/filename.png
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- Start Server -------------------- */
const PORT = Number(process.env.PORT) || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

/* -------------------- Global Error Handlers -------------------- */
// لو حصلت استثناءات غير ملتقطة
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  try {
    server.close(() => process.exit(1));
  } catch {
    process.exit(1);
  }
});

// لو حصلت وعود مرفوضة بدون catch
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  try {
    server.close(() => process.exit(1));
  } catch {
    process.exit(1);
  }
});
