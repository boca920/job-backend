import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import axios from "axios";
import toast from "react-hot-toast";
import { Navigate, Link } from "react-router-dom";
import ResumeModal from "./ResumeModal";

const toAbsolute = (url, API_BASE) => {
  if (!url) return "/careerconnect-transparent.png";
  const lower = String(url).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const formatSalary = (job) => {
  if (!job) return "N/A";
  if (job.fixedSalary) return `${job.fixedSalary} £E`;
  if (job.salaryFrom || job.salaryTo) return `${job.salaryFrom || ""} £E - ${job.salaryTo || ""} £E`;
  return "N/A";
};

const JobInfoBox = ({ job, API_BASE }) => {
  const companyName = job?.postedBy?.name || "Company";
  const companyImage = job?.postedBy?.avatar?.url;

  return (
    <div className="application-job-info">
      <div className="company-card-header compact">
        <img
          src={toAbsolute(companyImage, API_BASE)}
          alt={companyName}
          className="company-logo"
        />
        <div>
          <p className="company-name">{companyName}</p>
          <p className="job-title">{job?.title || "N/A"}</p>
        </div>
      </div>

      <div className="application-job-grid">
        <p><span>Category:</span> {job?.category || "N/A"}</p>
        <p><span>Work Type:</span> {job?.workType || "N/A"}</p>
        <p><span>Employment:</span> {job?.employmentType || "N/A"}</p>
        <p><span>Experience:</span> {job?.experience || "N/A"}</p>
        <p><span>Location:</span> {job?.city || "N/A"}, {job?.country || "N/A"}</p>
        <p><span>Salary:</span> {formatSalary(job)}</p>
      </div>
    </div>
  );
};

const MyApplications = () => {
  const { user, isAuthorized, API_BASE } = useContext(Context);
  const [applications, setApplications] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeImageUrl, setResumeImageUrl] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const endpoint =
          user && user.role === "Employer"
            ? `${API_BASE}/api/v1/application/employer/getall`
            : `${API_BASE}/api/v1/application/jobseeker/getall`;

        const res = await axios.get(endpoint, { withCredentials: true });
        setApplications(res.data.applications);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch applications");
      }
    };

    if (isAuthorized) fetchApplications();
  }, [API_BASE, isAuthorized, user]);

  if (!isAuthorized) {
    return <Navigate to="/login?redirect=/applications/me" state={{ from: "/applications/me" }} replace />;
  }

  const deleteApplication = async (id) => {
    try {
      const res = await axios.delete(`${API_BASE}/api/v1/application/delete/${id}`, {
        withCredentials: true,
      });

      toast.success(res.data.message);
      setApplications((prev) => prev.filter((application) => application._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting application");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/v1/application/updatestatus/${id}`,
        { status: newStatus },
        { withCredentials: true }
      );

      toast.success(res.data.message);
      setApplications((prev) =>
        prev.map((app) => (app._id === id ? { ...app, status: newStatus } : app))
      );
    } catch (error) {
      console.log(error.response?.status, error.response?.data);
      toast.error(error.response?.data?.message || "Error updating status");
    }
  };

  const openModal = (fileUrl) => {
    if (String(fileUrl || "").toLowerCase().includes(".pdf")) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setResumeImageUrl(fileUrl);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <section className="my_applications page">
      {user && user.role === "Job Seeker" ? (
        <div className="container">
          <center>
            <h1>My Applications</h1>
          </center>

          {applications.length <= 0 ? (
            <center><h4>No Applications Found</h4></center>
          ) : (
            applications.map((element) => (
              <JobSeekerCard
                key={element._id}
                element={element}
                deleteApplication={deleteApplication}
                openModal={openModal}
                API_BASE={API_BASE}
              />
            ))
          )}
        </div>
      ) : (
        <div className="container">
          <center>
            <h1>Applications From Job Seekers</h1>
          </center>

          {applications.length <= 0 ? (
            <center><h4>No Applications Found</h4></center>
          ) : (
            applications.map((element) => (
              <EmployerCard
                key={element._id}
                element={element}
                openModal={openModal}
                handleStatusChange={handleStatusChange}
                API_BASE={API_BASE}
              />
            ))
          )}
        </div>
      )}

      {modalOpen && <ResumeModal imageUrl={resumeImageUrl} onClose={closeModal} />}
    </section>
  );
};

export default MyApplications;


const ResumePreview = ({ url, openModal }) => {
  const isPdf = String(url || "").toLowerCase().includes(".pdf");
  return isPdf ? (
    <button className="resume-pdf-btn" onClick={() => openModal(url)}>
      Open CV PDF
    </button>
  ) : (
    <img src={url} alt="resume" onClick={() => openModal(url)} />
  );
};

const JobSeekerCard = ({ element, deleteApplication, openModal, API_BASE }) => {
  return (
    <div className="job_seeker_card">
      <div className="detail">
        <p><span>Name:</span> {element.name}</p>
        <p><span>Email:</span> {element.email}</p>
        <p><span>Phone:</span> {element.phone}</p>
        <p><span>Address:</span> {element.address}</p>
        <p><span>Cover Letter:</span> {element.coverLetter}</p>
        <p><span>Status:</span> {element.status}</p>

        <JobInfoBox job={element.job} API_BASE={API_BASE} />
      </div>

      <div className="resume">
        <ResumePreview url={element.resume.url} openModal={openModal} />
      </div>

      <div className="btn_area">
        <button onClick={() => deleteApplication(element._id)}>
          Delete Application
        </button>
      </div>
    </div>
  );
};

const EmployerCard = ({ element, openModal, handleStatusChange, API_BASE }) => {
  return (
    <div className="job_seeker_card">
      <div className="detail">
        <p><span>Name:</span> {element.name}</p>
        <p><span>Email:</span> {element.email}</p>
        <p><span>Phone:</span> {element.phone}</p>
        <p><span>Address:</span> {element.address}</p>
        <p><span>Cover Letter:</span> {element.coverLetter}</p>
        <p><span>Status:</span> {element.status}</p>

        <JobInfoBox job={element.job} API_BASE={API_BASE} />
      </div>

      <div className="resume">
        <ResumePreview url={element.resume.url} openModal={openModal} />
      </div>

      <div className="btn_area">
        <button
          style={{ backgroundColor: "green", color: "white" }}
          onClick={() => handleStatusChange(element._id, "Accepted")}
        >
          Accept
        </button>

        <button
          style={{ backgroundColor: "red", color: "white" }}
          onClick={() => handleStatusChange(element._id, "Rejected")}
        >
          Reject
        </button>

        <Link to={`/interview/schedule/${element._id}`} style={{ textDecoration: "none" }}>
          <button style={{ backgroundColor: "#111827", color: "white" }}>
            Schedule Interview
          </button>
        </Link>
      </div>
    </div>
  );
};
