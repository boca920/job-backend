import React, { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Context } from "../../main";

const toAbsolute = (url, API_BASE) => {
  if (!url) return "/careerconnect-transparent.png";
  const lower = String(url).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const formatSalary = (job) => {
  if (job.fixedSalary) return `${job.fixedSalary} £E`;
  if (job.salaryFrom || job.salaryTo) return `${job.salaryFrom || ""} £E - ${job.salaryTo || ""} £E`;
  return "N/A";
};

const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState({});
  const navigateTo = useNavigate();

  const { isAuthorized, user, API_BASE } = useContext(Context);
  const companyName = job?.postedBy?.name || "Company";
  const companyImage = job?.postedBy?.avatar?.url;

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/v1/job/${id}`, { withCredentials: true })
      .then((res) => setJob(res.data.job))
      .catch(() => navigateTo("/notfound"));
  }, [API_BASE, id, navigateTo]);

  return (
    <section className="jobDetail page">
      <div className="container">
        <h3>Job Details</h3>
        <div className="banner">
          <div className="company-profile-box">
            <img
              src={toAbsolute(companyImage, API_BASE)}
              alt={companyName}
              className="company-logo large"
            />
            <div>
              <p><span>Company:</span> {companyName}</p>
              <p><span>Title:</span> {job.title}</p>
            </div>
          </div>

          <p>
            Category: <span>{job.category}</span>
          </p>
          <p>
            Work Type: <span>{job.workType || "N/A"}</span>
          </p>
          <p>
            Employment Type: <span>{job.employmentType || "N/A"}</span>
          </p>
          <p>
            Experience: <span>{job.experience || "N/A"}</span>
          </p>
          <p>
            Country: <span>{job.country}</span>
          </p>
          <p>
            City: <span>{job.city}</span>
          </p>
          <p>
            Location: <span>{job.location}</span>
          </p>
          <p>
            Description: <span>{job.description}</span>
          </p>
          <p>
            Job Posted On: <span>{job.jobPostedOn}</span>
          </p>
          <p>
            Salary: <span>{formatSalary(job)}</span>
          </p>
          {job?._id && (user && user.role === "Employer" ? null : isAuthorized ? (
            <Link to={`/application/${job._id}`}>Apply Now</Link>
          ) : (
            <Link to={`/login?redirect=/application/${job._id}`} state={{ from: `/application/${job._id}` }}>
              Login to Apply
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JobDetails;
