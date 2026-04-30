import React, { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Context } from "../../main";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { api } = useContext(Context);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) return toast.error("Fill all fields");
    if (password !== confirmPassword) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const { data } = await api.put(`/user/reset-password/${token}`, {
        password,
        confirmPassword,
      });
      toast.success(data.message || "Password reset successfully");
      navigate("/login");
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login" style={{ minHeight: "80vh" }}>
      <div className="container">
        <h3>Reset Password</h3>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
