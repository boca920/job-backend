import React, { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Context } from "../../main";

const ScheduleInterview = () => {
  const { isAuthorized, user, api } = useContext(Context);
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local
  const [interviewType, setInterviewType] = useState("Online");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthorized || user?.role !== "Employer") {
    return (
      <div className="myJobs page" style={{ minHeight: "70vh" }}>
        <div className="container">
          <h3>Schedule Interview</h3>
          <p>Only Employers can access this page.</p>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!scheduledAt) return toast.error("Please select date & time");

    setLoading(true);
    try {
      await api.post("/interview/schedule", {
        applicationId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        interviewType,
        locationOrLink,
        notes,
      });
      toast.success("Interview scheduled");
      navigate("/interviews");
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="postJob page" style={{ minHeight: "70vh" }}>
      <div className="container">
        <h3>Schedule Interview</h3>
        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label>
              Date & Time
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </label>

            <label>
              Interview Type
              <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                <option value="Online">Online</option>
                <option value="Onsite">Onsite</option>
                <option value="Phone">Phone</option>
              </select>
            </label>

            <label>
              Location / Link (optional)
              <input
                type="text"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                placeholder={interviewType === "Online" ? "Zoom/Meet link" : "Address"}
              />
            </label>

            <label>
              Notes (optional)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any instructions..." />
            </label>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleInterview;
