import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Interview } from "../models/interviewSchema.js";
import { Application } from "../models/applicationSchema.js";
import { createNotification } from "../utils/notify.js";

export const scheduleInterview = catchAsyncErrors(async (req, res, next) => {
  if (req.user?.role !== "Employer") {
    return next(new ErrorHandler("Only Employers can schedule interviews.", 403));
  }

  const { applicationId, scheduledAt, interviewType, locationOrLink, notes } = req.body;
  if (!applicationId || !scheduledAt) {
    return next(new ErrorHandler("applicationId and scheduledAt are required!", 400));
  }

  const app = await Application.findById(applicationId);
  if (!app) return next(new ErrorHandler("Application not found!", 404));
  if (String(app.employerID.user) !== String(req.user._id)) {
    return next(new ErrorHandler("Not allowed for this application.", 403));
  }

  const dt = new Date(scheduledAt);
  if (isNaN(dt.getTime())) {
    return next(new ErrorHandler("Invalid scheduledAt datetime.", 400));
  }

  const interview = await Interview.create({
    application: app._id,
    employer: req.user._id,
    candidate: app.applicantID.user,
    scheduledAt: dt,
    interviewType: interviewType || "Online",
    locationOrLink: locationOrLink || "",
    notes: notes || "",
  });

  await createNotification({
    user: app.applicantID.user,
    title: "Interview scheduled",
    message: `Your interview has been scheduled on ${dt.toLocaleString()} (${interview.interviewType}).`,
    type: "INTERVIEW_SCHEDULED",
    meta: { interviewId: interview._id, applicationId: app._id },
  });

  res.status(201).json({ success: true, message: "Interview scheduled!", interview });
});

export const getMyInterviews = catchAsyncErrors(async (req, res) => {
  const filter =
    req.user?.role === "Employer"
      ? { employer: req.user._id }
      : { candidate: req.user._id };

  const interviews = await Interview.find(filter)
    .populate("application", "status")
    .sort({ scheduledAt: -1 });

  res.status(200).json({ success: true, interviews });
});

export const cancelInterview = catchAsyncErrors(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return next(new ErrorHandler("Interview not found!", 404));

  const isOwner =
    String(interview.employer) === String(req.user._id) ||
    String(interview.candidate) === String(req.user._id);

  if (!isOwner) return next(new ErrorHandler("Not allowed.", 403));

  interview.status = "Cancelled";
  await interview.save();

  const otherUser =
    String(interview.employer) === String(req.user._id)
      ? interview.candidate
      : interview.employer;

  await createNotification({
    user: otherUser,
    title: "Interview cancelled",
    message: "An interview has been cancelled.",
    type: "INTERVIEW_SCHEDULED",
    meta: { interviewId: interview._id },
  });

  res.status(200).json({ success: true, message: "Interview cancelled" });
});
