import React, { useContext, useEffect, useState } from "react";
import "./App.css";
import { Context } from "./main";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import { Toaster } from "react-hot-toast";
import axios from "axios";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./components/Home/Home";
import Jobs from "./components/Job/Jobs";
import JobDetails from "./components/Job/JobDetails";
import Application from "./components/Application/Application";
import MyApplications from "./components/Application/MyApplications";
import PostJob from "./components/Job/PostJob";
import NotFound from "./components/NotFound/NotFound";
import MyJobs from "./components/Job/MyJobs";
import Profile from "./components/Auth/Profile";
import ForgotPassword from "./components/Auth/ForgotPassword";
import ResetPassword from "./components/Auth/ResetPassword";
import VerifyOtp from "./components/Auth/VerifyOtp";
import Notifications from "./components/Notification/Notifications";
import MyInterviews from "./components/Interview/MyInterviews";
import ScheduleInterview from "./components/Interview/ScheduleInterview";

// ===== API base (يدعم env) =====
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  "http://localhost:4000";

// axios instance موحّد
const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});

const App = () => {
  const { setIsAuthorized, setUser } = useContext(Context);
  const [bootLoading, setBootLoading] = useState(true); // حالة تحميل أولية

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/user/getuser");
        if (!mounted) return;
        setUser(res.data.user);
        setIsAuthorized(true);
      } catch {
        if (!mounted) return;
        setIsAuthorized(false);
        setUser(null);
      } finally {
        if (mounted) setBootLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // مهم: نسيبها [] علشان ما تعملش loop
  }, [setIsAuthorized, setUser]);

  return (
    <>
      <BrowserRouter>
        <Navbar />

        {/* شاشة تحميل خفيفة أثناء تمهيد الجلسة */}
        {bootLoading ? (
          <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
            <div className="spinner" />
          </div>
        ) : (
          <Routes>
            {/* ======= Auth Routes ======= */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ======= Main Pages ======= */}
            <Route path="/" element={<Home />} />
            <Route path="/job/getall" element={<Jobs />} />
            <Route path="/job/:id" element={<JobDetails />} />

            {/* ======= Applications ======= */}
            <Route path="/application/:id" element={<Application />} />
            <Route path="/applications/me" element={<MyApplications />} />

            {/* ======= Employer ======= */}
            <Route path="/job/post" element={<PostJob />} />
            <Route path="/job/me" element={<MyJobs />} />

            {/* ======= User Profile ======= */}
            <Route path="/profile" element={<Profile />} />
            {/* ======= Extra Features ======= */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/interviews" element={<MyInterviews />} />
            <Route path="/interview/schedule/:applicationId" element={<ScheduleInterview />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            {/* alias للكابيتال لو عندك لينكات قديمة */}
            <Route path="/Profile" element={<Profile />} />

            {/* ======= Fallback ======= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}

        <Footer />
        <Toaster />
      </BrowserRouter>

      {/* ستايل بسيط للسبينر */}
      <style>{`
        .spinner {
          width: 44px; height: 44px; border-radius: 50%;
          border: 4px solid #e5e7eb; border-top-color: #111827;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default App;
