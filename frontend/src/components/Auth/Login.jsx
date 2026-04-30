import React, { useContext, useState } from "react";
import { RiLock2Fill } from "react-icons/ri";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaRegUser } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import { Context } from "../../main";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotBox, setShowForgotBox] = useState(false);

  const { isAuthorized, setIsAuthorized, setUser, API_BASE } = useContext(Context);
  const navigateTo = useNavigate();
  const location = useLocation();

  const redirectTo =
    location.state?.from ||
    new URLSearchParams(location.search).get("redirect") ||
    "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Please enter username and password");
      return;
    }

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/v1/user/login`,
        { username: username.trim(), password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      toast.success(data.message);
      setUser(data.user);
      setIsAuthorized(true);
      setUsername("");
      setPassword("");
      navigateTo(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  const openForgot = () => {
    setShowForgotBox(true);
    setForgotStep(1);
    setForgotEmail("");
    setForgotOtp("");
    setForgotPassword("");
    setForgotConfirmPassword("");
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error("Please enter your email address");
    try {
      setForgotLoading(true);
      const { data } = await axios.post(
        `${API_BASE}/api/v1/user/forgot-password`,
        { email: forgotEmail },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      toast.success(data.message || "OTP sent");
      setForgotStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotOtp || !forgotPassword || !forgotConfirmPassword) {
      return toast.error("Please fill all fields");
    }
    try {
      setForgotLoading(true);
      const { data } = await axios.put(
        `${API_BASE}/api/v1/user/reset-password`,
        {
          email: forgotEmail,
          otp: forgotOtp,
          password: forgotPassword,
          confirmPassword: forgotConfirmPassword,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      toast.success(data.message || "Password reset successfully");
      setShowForgotBox(false);
      setForgotStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setForgotPassword("");
      setForgotConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  if (isAuthorized) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <>
      <section className="authPage">
        <div className="container">
          <div className="header">
            <h3>Welcome back</h3>
          </div>

          <form onSubmit={handleLogin}>
            <div className="inputTag">
              <label>Username</label>
              <div>
                <input
                  type="text"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <FaRegUser />
              </div>
            </div>

            <div className="inputTag">
              <label>Password</label>
              <div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <RiLock2Fill />
              </div>
            </div>

            <div className="extraOptions">
              <p className="forgotLink" onClick={openForgot}>
                Forgot Password?
              </p>
            </div>

            <button type="submit">Login</button>
            <Link to="/register">Register Now</Link>
          </form>

          {showForgotBox && (
            <div className="forgotBox">
              <h4>Reset Password</h4>
              {forgotStep === 1 ? (
                <>
                  <p>Enter your registered email to receive an OTP code.</p>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <button onClick={handleForgotSendOtp} disabled={forgotLoading}>
                    {forgotLoading ? "Sending..." : "Send OTP"}
                  </button>
                </>
              ) : (
                <>
                  <p>Enter OTP and set a new password.</p>
                  <input
                    type="text"
                    placeholder="OTP"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  />
                  <button onClick={handleForgotReset} disabled={forgotLoading}>
                    {forgotLoading ? "Saving..." : "Reset Password"}
                  </button>
                  <button
                    className="cancelBtn"
                    onClick={() => setForgotStep(1)}
                    disabled={forgotLoading}
                  >
                    Back
                  </button>
                </>
              )}
              <button
                className="cancelBtn"
                onClick={() => setShowForgotBox(false)}
                disabled={forgotLoading}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="banner">
          <img src="/login.png" alt="login" />
        </div>
      </section>

      <style>{`
        .forgotBox {
          background: #fff;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999;
          width: 90%;
          max-width: 400px;
          text-align: center;
        }
        .forgotBox input {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .forgotBox button {
          margin: 5px;
          padding: 8px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .forgotBox button:first-child {
          background: #007bff;
          color: white;
        }
        .cancelBtn {
          background: #dc3545;
          color: white;
        }
        .forgotLink {
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.9rem;
        }
      `}</style>
    </>
  );
};

export default Login;
