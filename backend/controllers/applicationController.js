import fs from "fs";
import cloudinary from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import Job from "../models/jobSchema.js";
import { uploadBuffer } from "../utils/cloudinary.js";
import { createNotification } from "../utils/notify.js";

/* Helpers */
const cloudEnabled =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const safeUnlink = (p) => p && fs.promises.unlink(p).catch(() => {});

/* =============== 1) إرسال طلب وظيفة =============== */
export const postApplication = catchAsyncErrors(async (req, res, next) => {
  if (req.user?.role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  if (!req.file) {
    return next(new ErrorHandler("Resume File Required!", 400));
  }

  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  if (!allowed.includes(req.file.mimetype)) {
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

  // ✅ تحقق من الوظيفة
  const jobDetails = await Job.findById(jobId);
  if (!jobDetails) {
    await safeUnlink(req.file.path);
    return next(new ErrorHandler("Job not found!", 404));
  }

  const applicantID = { user: req.user._id, role: "Job Seeker" };
  const employerID = { user: jobDetails.postedBy, role: "Employer" };

  let uploadedUrl = null;
  let uploadedPublicId = null;

  try {
    if (cloudEnabled) {
      if (req.file.buffer) {
        await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: "job-portal/applications",
              resource_type: "auto",
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
      } else if (req.file.path) {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "job-portal/applications",
          resource_type: "auto",
        });
        uploadedUrl = result.secure_url;
        uploadedPublicId = result.public_id;
        await safeUnlink(req.file.path);
      }
    } else {
      if (req.file.buffer) {
        const result = await uploadBuffer(req.file.buffer, "applications");
        uploadedUrl = result.secure_url;
        uploadedPublicId = result.public_id;
      } else if (req.file.path) {
        const buffer = await fs.promises.readFile(req.file.path);
        const result = await uploadBuffer(buffer, "applications");
        uploadedUrl = result.secure_url;
        uploadedPublicId = result.public_id;
        await safeUnlink(req.file.path);
      }
    }
  } catch (error) {
    await safeUnlink(req.file?.path);
    return next(new ErrorHandler("Failed to upload resume.", 500));
  }

  // ✅ إنشاء الطلب مع ربط الوظيفة
  const application = await Application.create({
    name,
    email,
    coverLetter,
    phone,
    address,
    applicantID,
    employerID,
    job: jobId, // 🔥 أهم إضافة
    resume: {
      public_id: uploadedPublicId,
      url: uploadedUrl,
    },
    status: "Pending",
  });

  await createNotification({
    user: employerID.user,
    title: "New application",
    message: `${name} applied for a job.`,
    type: "APPLICATION_NEW",
    meta: { applicationId: application._id },
  });

  res.status(200).json({
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

    const apps = await Application.find({
      "employerID.user": req.user._id,
    })
      .populate("job", "title company") // 🔥
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

    const apps = await Application.find({
      "applicantID.user": req.user._id,
    })
      .populate("job", "title company") // 🔥
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, applications: apps });
  }
);

/* =============== 4) حذف طلب =============== */
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

    res.status(200).json({
      success: true,
      message: "Application Deleted!",
    });
  }
);

/* =============== 5) تحديث الحالة =============== */
export const updateApplicationStatus = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user?.role === "Job Seeker") {
      return next(
        new ErrorHandler(
          "Job Seeker not allowed to access this resource.",
          400
        )
      );
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return next(new ErrorHandler("Invalid status value!", 400));
    }

    const application = await Application.findById(id);
    if (!application)
      return next(new ErrorHandler("Application not found!", 404));

    application.status = status;
    await application.save();

    await createNotification({
      user: application.applicantID.user,
      title: "Application status updated",
      message: `Your application status is now: ${status}.`,
      type: "APPLICATION_STATUS",
      meta: { applicationId: application._id, status },
    });

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      application,
    });
  }
);