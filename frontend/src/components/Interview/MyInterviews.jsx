import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Context } from "../../main";

const MyInterviews = () => {
  const { isAuthorized, api, user } = useContext(Context);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interview/my");
      setItems(data.interviews || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const cancel = async (id) => {
    try {
      await api.patch(`/interview/cancel/${id}`);
      toast.success("Interview cancelled");
      setItems((prev) => prev.map((i) => (i._id === id ? { ...i, status: "Cancelled" } : i)));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to cancel");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="myJobs page" style={{ minHeight: "70vh" }}>
        <div className="container">
          <h3>My Interviews</h3>
          <p>Please login to view interviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="myJobs page" style={{ minHeight: "70vh" }}>
      <div className="container">
        <h3>My Interviews</h3>
        <p style={{ color: "var(--neutral-gray)", marginTop: 6 }}>
          {user?.role === "Employer" ? "Interviews you scheduled" : "Interviews scheduled for you"}
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p style={{ marginTop: 20 }}>No interviews yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            {items.map((i) => (
              <div
                key={i._id}
                style={{
                  background: "var(--pure-white)",
                  border: "1px solid var(--border-light)",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: "var(--shadow)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{new Date(i.scheduledAt).toLocaleString()}</strong>
                    <div style={{ color: "var(--neutral-gray)", marginTop: 4 }}>{i.interviewType}</div>
                  </div>
                  <div style={{ color: "var(--neutral-gray)" }}>{i.status}</div>
                </div>

                {i.locationOrLink ? (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ color: "var(--neutral-gray)" }}>Location/Link:</span> {i.locationOrLink}
                  </div>
                ) : null}

                {i.notes ? (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ color: "var(--neutral-gray)" }}>Notes:</span> {i.notes}
                  </div>
                ) : null}

                {i.status === "Scheduled" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button className="btn" onClick={() => cancel(i._id)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInterviews;
