import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Context } from "../../main";

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
};

const Notifications = () => {
  const { isAuthorized, user, api } = useContext(Context);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notification/my?limit=50");
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notification/read/${id}`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to mark as read");
    }
  };

  const markAll = async () => {
    try {
      await api.patch(`/notification/read-all`);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All marked as read");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to mark all");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="notifications-container">
        <div className="notifications-card">
          <h2 className="notifications-title">Notifications</h2>
          <div className="empty-notifications">
            <p>Please login to view your notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-card">
        <h2 className="notifications-title">
          Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ""}
        </h2>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
          <button className="mark-read-btn" onClick={fetchAll} disabled={loading}>
            Refresh
          </button>
          <button className="mark-read-btn" onClick={markAll} disabled={loading || items.length === 0}>
            Mark all read
          </button>
        </div>

        {loading ? (
          <div className="empty-notifications">
            <p>Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-notifications">
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {items.map((n) => (
              <div key={n._id} className={`notification-item ${n.isRead ? "" : "unread"}`}>
                <div className="notification-message">
                  <strong>{n.title}</strong>
                  <div style={{ marginTop: 6 }}>{n.message}</div>
                </div>
                <div className="notification-time">{formatTime(n.createdAt)}</div>
                <div className="notification-actions">
                  {!n.isRead && (
                    <button className="mark-read-btn" onClick={() => markRead(n._id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {user?.otpVerified === false && (
          <div style={{ marginTop: 20, fontSize: 14, color: "var(--neutral-gray)" }}>
            Tip: Verify your account from <b>Profile</b> using OTP.
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
