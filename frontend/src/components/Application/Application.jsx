import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Context } from "../../main";

const toAbsolute = (url, API_BASE) => {
  if (!url) return "/careerconnect-transparent.png";
  const lower = String(url).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const Application = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [job, setJob] = useState(null);

  const { isAuthorized, user, API_BASE } = useContext(Context);
  const navigateTo = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/v1/job/${id}`, { withCredentials: true })
      .then((res) => setJob(res.data.job))
      .catch(() => setJob(null));
  }, [API_BASE, id]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFileError("");

    if (!file) {
      setResume(null);
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Please select a valid file (PDF, PNG, JPEG, or WEBP)");
      setResume(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError("File size should be less than 2MB");
      setResume(null);
      return;
    }

    setResume(file);
  };

  const handleApplication = async (e) => {
    e.preventDefault();

    if (!name || !email || !phone || !address || !coverLetter) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!resume) {
      setFileError("Please upload your resume");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("coverLetter", coverLetter);
    formData.append("resume", resume);
    formData.append("jobId", id);

    try {
      const { data } = await axios.post(`${API_BASE}/api/v1/application/post`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setName("");
      setEmail("");
      setCoverLetter("");
      setPhone("");
      setAddress("");
      setResume(null);
      toast.success(data.message);
      navigateTo("/job/getall");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong. Please try again later.";
      toast.error(errorMessage);

      if (errorMessage.includes("Cloudinary") || errorMessage.includes("api_key")) {
        toast.error("File upload service is currently unavailable. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return <Navigate to={`/login?redirect=/application/${id}`} state={{ from: `/application/${id}` }} replace />;
  }

  if (user && user.role === "Employer") {
    return <Navigate to="/" replace />;
  }

  const companyName = job?.postedBy?.name || "Company";
  const companyImage = job?.postedBy?.avatar?.url;

  return (
    <section className="application">
      <div className="container">
        <h3>Application Form</h3>

        {job && (
          <div className="application-job-summary">
            <img
              src={toAbsolute(companyImage, API_BASE)}
              alt={companyName}
              className="company-logo large"
            />
            <div>
              <p><span>Applying for:</span> {job.title}</p>
              <p><span>Company:</span> {companyName}</p>
              <p><span>Location:</span> {job.city}, {job.country}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleApplication}>
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Your Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Your Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <textarea
            placeholder="Cover Letter..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            required
          />
          <div>
            <label style={{ textAlign: "start", display: "block", fontSize: "20px" }}>
              Upload CV
              <p style={{ color: "red", fontSize: "12px", margin: "5px 0 0 0" }}>
                (Supported formats: PDF, PNG, JPEG, WEBP. Max size: 2MB)
              </p>
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              style={{ width: "100%" }}
            />
            {fileError && (
              <p style={{ color: "red", fontSize: "14px", marginTop: "5px" }}>
                {fileError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Submitting..." : "Send Application"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Application;
