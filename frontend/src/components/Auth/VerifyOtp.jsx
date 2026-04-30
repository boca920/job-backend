import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";

const VerifyOtp = () => {
  const { isAuthorized, user, api, setUser } = useContext(Context);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const request = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/user/otp/request");
      toast.success(data.message || "OTP sent");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("Enter OTP");
    setLoading(true);
    try {
      const { data } = await api.post("/user/otp/verify", { otp });
      toast.success(data.message || "Verified");

      // refresh user
      const me = await api.get("/user/getuser");
      setUser(me.data.user);

      //  go to profile after success
      navigate("/profile");
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to verify");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="login" style={{ minHeight: "80vh" }}>
        <div className="container">
          <h3>Verify OTP</h3>
          <p>Please login first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login" style={{ minHeight: "80vh" }}>
      <div className="container">
        <h3>Verify OTP</h3>
        <p style={{ color: "var(--neutral-gray)", marginBottom: 16 }}>
          We will send a 6-digit OTP to your email: <b>{user?.email}</b>
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={request} disabled={loading}>
            Send OTP
          </button>
          {user?.otpVerified ? (
            <span style={{ alignSelf: "center", color: "var(--primary-dark)", fontWeight: 700 }}>
              Verified ✓
            </span>
          ) : (
            <span style={{ alignSelf: "center", color: "var(--neutral-gray)" }}>Not verified</span>
          )}
        </div>

        <form onSubmit={verify}>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
