import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import Job from "../models/jobSchema.js";
import ErrorHandler from "../middlewares/error.js";

// =======================
//  Get All Jobs
// =======================
export const getAllJobs = catchAsyncErrors(async (req, res, next) => {
  const jobs = await Job.find({ expired: false });

  res.status(200).json({
    success: true,
    jobs,
  });
});

// =======================
//  Post a Job
// =======================
export const postJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;

  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }

  const {
    title,
    description,
    category,
    workType,
    employmentType,
    experience,
    country,
    city,
    location,
    fixedSalary,
    salaryFrom,
    salaryTo,
    companyName,
    companyLogo,
    companyDescription,
  } = req.body;

  if (!title || !description || !category || !country || !city || !location) {
    return next(new ErrorHandler("Please provide full job details.", 400));
  }

  if ((!salaryFrom || !salaryTo) && !fixedSalary) {
    return next(
      new ErrorHandler(
        "Please either provide fixed salary or ranged salary.",
        400
      )
    );
  }

  if (salaryFrom && salaryTo && fixedSalary) {
    return next(
      new ErrorHandler("Cannot Enter Fixed and Ranged Salary together.", 400)
    );
  }

  const postedBy = req.user._id;

  const job = await Job.create({
    title,
    description,
    category,
    workType,
    employmentType,
    experience,
    country,
    city,
    location,
    fixedSalary,
    salaryFrom,
    salaryTo,
    postedBy,
    companyName,
    companyLogo,
    companyDescription,
  });

  res.status(200).json({
    success: true,
    message: "Job Posted Successfully!",
    job,
  });
});

// =======================
//  Get My Jobs
// =======================
export const getMyJobs = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;

  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }

  const myJobs = await Job.find({ postedBy: req.user._id });

  res.status(200).json({
    success: true,
    myJobs,
  });
});

// =======================
//  Update Job
// =======================
export const updateJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;

  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }

  const { id } = req.params;

  let job = await Job.findById(id);

  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }

  job = await Job.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    message: "Job Updated!",
  });
});

// =======================
//  Delete Job
// =======================
export const deleteJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;

  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }

  const { id } = req.params;

  const job = await Job.findById(id);

  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }

  await job.deleteOne();

  res.status(200).json({
    success: true,
    message: "Job Deleted!",
  });
});

// =======================
//  Get Single Job
// =======================
export const getSingleJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  try {
    const job = await Job.findById(id);

    if (!job) {
      return next(new ErrorHandler("Job not found.", 404));
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return next(new ErrorHandler("Invalid ID / CastError", 404));
  }
});

// =======================
//  Search Jobs
// =======================
export const searchJobs = catchAsyncErrors(async (req, res, next) => {
  const {
    query,
    keyword,
    workType,
    employmentType,
    experience,
    salaryMin,
    salaryMax,
  } = req.query;

  const q = (query ?? keyword ?? "").trim();

  const filters = { expired: false };

  if (workType?.trim()) filters.workType = workType.trim();
  if (employmentType?.trim())
    filters.employmentType = employmentType.trim();
  if (experience?.trim()) filters.experience = experience.trim();

 if (q) {
  filters.$or = [
    { title: { $regex: q, $options: "i" } },
    { description: { $regex: q, $options: "i" } },
    { category: { $regex: q, $options: "i" } },
    { country: { $regex: q, $options: "i" } },
    { city: { $regex: q, $options: "i" } },
    { location: { $regex: q, $options: "i" } },
    { companyName: { $regex: q, $options: "i" } },        // جديد
    { companyDescription: { $regex: q, $options: "i" } }, // جديد
  ];
}

  const min =
    salaryMin !== undefined && salaryMin !== ""
      ? Number(salaryMin)
      : undefined;

  const max =
    salaryMax !== undefined && salaryMax !== ""
      ? Number(salaryMax)
      : undefined;

  if (
    (min !== undefined && !Number.isNaN(min)) ||
    (max !== undefined && !Number.isNaN(max))
  ) {
    const salaryOr = [];

    const fixedCond = {};
    if (min !== undefined && !Number.isNaN(min)) fixedCond.$gte = min;
    if (max !== undefined && !Number.isNaN(max)) fixedCond.$lte = max;

    salaryOr.push({ fixedSalary: fixedCond });

    const rangeCond = {};
    if (min !== undefined && !Number.isNaN(min))
      rangeCond.salaryTo = { $gte: min };
    if (max !== undefined && !Number.isNaN(max))
      rangeCond.salaryFrom = { $lte: max };

    salaryOr.push(rangeCond);

    filters.$and = filters.$and || [];
    filters.$and.push({ $or: salaryOr });
  }

  const jobs = await Job.find(filters).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    results: jobs.length,
    jobs,
  });
});
