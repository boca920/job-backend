// backend/controllers/applicationController.js
import fs from "fs";
import path from "path";
import cloudinary from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import Job from "../models/jobSchema.js";
import { uploadBuffer } from "../utils/cloudinary.js"; // بديل محلي جاهز
import { createNotification } from "../utils/notify.js"; // بديل محلي جاهز

/* Helpers */
const cloudEnabled =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const safeUnlink = (p) => p && fs.promises.unlink(p).catch(() => {});

/* =============== 1) إرسال طلب وظيفة =============== */
export const postApplication = catchAsyncErrors(async (req, res, next) => {
  // منع أصحاب العمل من التقديم
  if (req.user?.role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  // Multer يضع الملف في req.file (مش req.files)
  if (!req.file) {
    return next(new ErrorHandler("Resume File Required!", 400));
  }

  // السماح بصيغ الصور الشائعة + PDF (عدّلها لو عايز صور فقط)
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];
  if (!allowed.includes(req.file.mimetype)) {
    // لو كنت عاوز صور فقط: استخدم allowed = ["image/png","image/jpeg","image/webp"]
    await safeUnlink(req.file.path);
    return next(
      new ErrorHandler(
        "Invalid file type. Please upload a PDF, PNG, JPEG, or WEBP file.",
        400
      )
    );
  }

  const { name, email, coverLetter, phone, address, jobId } = req.body;

  if (!name || !email || !coverLetter || !phone || !address || !jobId) {
    await safeUnlink(req.file.path);
    return next(new ErrorHandler("Please fill all fields.", 400));
  }

  // تحقّق من الوظيفة
  const jobDetails = await Job.findById(jobId);
  if (!jobDetails) {
    await safeUnlink(req.file.path);
    return next(new ErrorHandler("Job not found!", 404));
  }

  const applicantID = { user: req.user._id, role: "Job Seeker" };
  const employerID = { user: jobDetails.postedBy, role: "Employer" };

  // رفع الملف (Cloudinary أو بديل محلي)
  let uploadedUrl = null;
  let uploadedPublicId = null;

  try {
    // 1) Cloudinary متاح
    if (cloudEnabled) {
      // a) memoryStorage (req.file.buffer)
      if (req.file.buffer) {
        // ارفع الـ buffer مباشرة (resource_type:auto يتحدد تلقائي)
        const uploaded = await cloudinary.v2.uploader.upload_stream({
          folder: "job-portal/applications",
          resource_type: "auto",
          overwrite: true,
          invalidate: true,
        }, async (err, result) => {
          if (err) throw err;
          uploadedUrl = result.secure_url;
          uploadedPublicId = result.public_id;
        });

        // لرفع عبر stream لازم نكتبها كالتالي:
        await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: "job-portal/applications",
              resource_type: "auto",
              overwrite: true,
              invalidate: true,
            },
            (err, result) => {
              if (err) return reject(err);
              uploadedUrl = result.secure_url;
              uploadedPublicId = result.public_id;
              resolve();
            }
          );
          stream.end(req.file.buffer);
        });
      }
      // b) diskStorage (req.file.path)
      else if (req.file.path) {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "job-portal/applications",
          resource_type: "auto", // يدعم pdf والصور
          overwrite: true,
          invalidate: true,
        });
        uploadedUrl = result.secure_url;
        uploadedPublicId = result.public_id;
        await safeUnlink(req.file.path); // نظّف الملف المؤقت
      } else {
        throw new Error("Unsupported upload source.");
      }
    }
    // 2) Cloudinary غير متاح → ارفع محليًا
    else {
      // لو memory: buffer موجود — ارفعه محلي
      if (req.file.buffer) {
        const result = await uploadBuffer(req.file.buffer, "applications");
        uploadedUrl = result.secure_url;    // مثال: /uploads/applications/xxx.bin
        uploadedPublicId = result.public_id; // مثال: local_applications_xxx.bin
      }
      // لو disk: اقرأ الملف وارفعه محليًا ثم احذف المؤقت
      else if (req.file.path) {
        const buffer = await fs.promises.readFile(req.file.path);
        const result = await uploadBuffer(buffer, "applications");
        uploadedUrl = result.secure_url;
        uploadedPublicId = result.public_id;
        await safeUnlink(req.file.path);
      } else {
        throw new Error("Unsupported upload source.");
      }
    }
  } catch (error) {
    // مسح المؤقت لو فشلنا
    await safeUnlink(req.file?.path);
    if (String(error?.message || "").includes("api_key")) {
      return next(
        new ErrorHandler("File upload service configuration error", 500)
      );
    }
    console.error("[postApplication:upload] ", error?.message || error);
    return next(new ErrorHandler("Failed to upload resume.", 500));
  }

  // إنشاء الطلب
  const application = await Application.create({
    name,
    email,
    coverLetter,
    phone,
    address,
    applicantID,
    employerID,
    resume: {
      public_id: uploadedPublicId,
      url: uploadedUrl,
    },
    status: "Pending",
  });

  
  // Notify employer
  await createNotification({
    user: employerID.user,
    title: "New application",
    message: `${name} applied for a job.`,
    type: "APPLICATION_NEW",
    meta: { applicationId: application._id },
  });

return res.status(200).json({
    success: true,
    message: "Application Submitted!",
    application,
  });
});

/* =============== 2) طلبات صاحب العمل =============== */
export const employerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user?.role === "Job Seeker") {
      return next(
        new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
      );
    }
    const apps = await Application.find({ "employerID.user": req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, applications: apps });
  }
);

/* =============== 3) طلبات المتقدّم =============== */
export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user?.role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const apps = await Application.find({ "applicantID.user": req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, applications: apps });
  }
);

/* =============== 4) حذف طلب (للمتقدّم) =============== */
export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user?.role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const app = await Application.findById(req.params.id);
    if (!app) return next(new ErrorHandler("Application not found!", 404));

    await app.deleteOne();
    res.status(200).json({ success: true, message: "Application Deleted!" });
  }
);

/* =============== 5) تحديث حالة الطلب (صاحب العمل) =============== */
export const updateApplicationStatus = catchAsyncErrors(async (req, res, next) => {
  if (req.user?.role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!["Pending", "Accepted", "Rejected"].includes(status)) {
    return next(new ErrorHandler("Invalid status value!", 400));
  }

  const application = await Application.findById(id);
  if (!application) return next(new ErrorHandler("Application not found!", 404));

  application.status = status;
  await application.save();

  // Notify applicant
  await createNotification({
    user: application.applicantID.user,
    title: "Application status updated",
    message: `Your application status is now: ${status}.`,
    type: "APPLICATION_STATUS",
    meta: { applicationId: application._id, status },
  });

  res
    .status(200)
    .json({ success: true, message: `Application status updated to ${status}`, application });
});
