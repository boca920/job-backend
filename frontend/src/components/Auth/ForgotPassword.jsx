import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { Context } from "../../main";

const ForgotPassword = () => {
  const { api } = useContext(Context);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1: send otp, 2: reset password
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");
    setLoading(true);
    try {
      const { data } = await api.post("/user/forgot-password", { email });
      toast.success(data.message || "OTP sent");
      setStep(2);
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!email || !otp || !password || !confirmPassword) {
      return toast.error("Please fill all fields");
    }
    setLoading(true);
    try {
      const { data } = await api.put("/user/reset-password", {
        email,
        otp,
        password,
        confirmPassword,
      });
      toast.success(data.message || "Password reset successfully");
      setEmail("");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setStep(1);
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login" style={{ minHeight: "80vh" }}>
      <div className="container">
        <h3>Forgot Password</h3>
        {step === 1 ? (
          <>
            <p style={{ color: "var(--neutral-gray)", marginBottom: 16 }}>
              Enter your email and we will send you an OTP code.
            </p>
            <form onSubmit={submit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ color: "var(--neutral-gray)", marginBottom: 16 }}>
              Enter the OTP sent to your email and set a new password.
            </p>
            <form onSubmit={submitReset}>
              <input
                type="text"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Reset Password"}
              </button>
              <button
                type="button"
                className="btn"
                style={{ marginTop: 10 }}
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
