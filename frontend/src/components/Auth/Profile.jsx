import React, { useContext, useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Context } from "../../main";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  FaUserEdit,
  FaLock,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaIdBadge,
  FaTrash,
  FaImage,
} from "react-icons/fa";

/** ======== helpers ======== */
const toAbsolute = (url, API_BASE) => {
  if (!url) return url;
  const lower = String(url).toLowerCase();
  const isAbsolute = lower.startsWith("http://") || lower.startsWith("https://");
  if (isAbsolute) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const convertDateFormat = (isoDate) => {
  try {
    if (!isoDate) return "—";
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const IMG_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const RESUME_TYPES = ["application/pdf", ...IMG_TYPES];

/** حدود اختيارية للمهارات */
const MAX_SKILLS_COUNT = 20;
const MAX_SKILL_LENGTH = 30;

const Profile = () => {
  const { isAuthorized, user, setUser, api, API_BASE, setIsAuthorized } = useContext(Context);
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  /** حالة المهارات (للتحرير داخل المودال) */
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  // previews (object URLs)
  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile]
  );
  const resumePreview = useMemo(
    () => (resumeFile ? URL.createObjectURL(resumeFile) : null),
    [resumeFile]
  );

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setSkills(Array.isArray(user.skills) ? user.skills : []);
    }
  }, [user]);

  useEffect(() => () => avatarPreview && URL.revokeObjectURL(avatarPreview), [avatarPreview]);
  useEffect(() => () => resumePreview && URL.revokeObjectURL(resumePreview), [resumePreview]);

  /** ======== مهارات: دوال مساعدة ======== */
  const normalizeSkill = (txt) => String(txt).trim().replace(/\s+/g, " ");

  // تقسيم مرن: فاصلة , أو سطر جديد \n أو سيمي-كولن ; أو | أو تاب
  const splitToSkills = (txt) =>
    String(txt)
      .split(/[\n,;|\t]+/g)
      .map(normalizeSkill)
      .filter(Boolean);

  const addSkill = (raw) => {
    const s = normalizeSkill(raw);
    if (!s) return;
    if (s.length > MAX_SKILL_LENGTH) {
      return toast.error(`Skill is too long (max ${MAX_SKILL_LENGTH} chars)`);
    }
    if (skills.map((x) => x.toLowerCase()).includes(s.toLowerCase())) {
      return toast.error("Skill already added");
    }
    if (skills.length >= MAX_SKILLS_COUNT) {
      return toast.error(`Max ${MAX_SKILLS_COUNT} skills`);
    }
    setSkills((prev) => [...prev, s]);
  };

  const addManySkills = (raw) => {
    const parts = splitToSkills(raw);
    if (!parts.length) return;
    const existing = new Set(skills.map((x) => x.toLowerCase()));
    const next = [...skills];

    for (const p of parts) {
      const s = normalizeSkill(p);
      if (!s) continue;
      if (s.length > MAX_SKILL_LENGTH) continue;
      const key = s.toLowerCase();
      if (existing.has(key)) continue;
      if (next.length >= MAX_SKILLS_COUNT) break;
      existing.add(key);
      next.push(s);
    }

    if (next.length === skills.length) {
      return toast.error("No new valid skills to add");
    }
    setSkills(next);
  };

  const removeSkill = (s) => setSkills((prev) => prev.filter((x) => x !== s));

  const onSkillInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (skillInput) {
        addManySkills(skillInput);
        setSkillInput("");
      }
    } else if (e.key === "Backspace" && !skillInput && skills.length) {
      // backspace بدون نص: احذف آخر تشيب
      removeSkill(skills[skills.length - 1]);
    }
  };

  const onSkillInputPaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (text) {
      e.preventDefault();
      addManySkills(text);
      setSkillInput("");
    }
  };

  /** ================= Actions ================= */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put(
        `/user/update-profile`,
        { name, phone, email },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message || "Profile updated");
      setUser(data.user);
      setIsEditOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put(
        `/user/update-password`,
        { oldPassword, newPassword, confirmPassword },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message || "Password updated");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Password update failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) return toast.error("Choose an image first");
    if (!IMG_TYPES.includes(avatarFile.type)) {
      return toast.error("Avatar must be an image (jpeg/jpg/png/webp)");
    }
    if (avatarFile.size > MAX_SIZE) {
      return toast.error("Max file size is 10MB");
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", avatarFile);
      const { data } = await api.put(`/user/update-avatar`, form);
      toast.success(data.message || "Avatar updated");
      setUser(data.user);
      setIsAvatarOpen(false);
      setAvatarFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!resumeFile) return toast.error("Choose a file first");
    if (!RESUME_TYPES.includes(resumeFile.type)) {
      return toast.error("Resume must be a PDF or image");
    }
    if (resumeFile.size > MAX_SIZE) {
      return toast.error("Max file size is 10MB");
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("resume", resumeFile);
      const { data } = await api.put(`/user/upload-resume`, form);
      toast.success(data.message || "Resume uploaded");
      setUser(data.user);
      setIsResumeOpen(false);
      setResumeFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload resume");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSkills = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put(
        `/user/update-skills`,
        { skills },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message || "Skills updated");
      setUser(data.user);
      setIsSkillsOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update skills");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const ok = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!ok) return;
    setLoading(true);
    try {
      const { data } = await api.delete(`/user/delete-account`);
      toast.success(data.message || "Account deleted");

      // 1) صفّر المستخدم محليًا
      setUser(null);

      // 2) (اختياري) علِّم النظام أنك غير مصرح بعد الآن
      setIsAuthorized?.(false);

      // 3) (اختياري) اطلب من الخادم مسح الكوكي/السيشن إن كان لديك route لذلك
      try {
        if (typeof api.post === "function") {
          await api.post(`/user/logout`);
        }
      } catch {
        // تجاهل أي خطأ في تسجيل الخروج الاختياري
      }

      // 4) امسح أي توكن مخزن على الجهاز (إن وُجد)
      try {
        localStorage.removeItem("token");
      } catch {}

      // 5) وجّه فورًا لصفحة تسجيل الدخول
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return <Navigate to="/login" />;

  return (
    <section className="profilePage">
      <div className="container">
        <h2 className="title"><FaUserEdit /> My Profile</h2>

        <div className="profile-grid">
          {/* LEFT: avatar + quick actions */}
          <div className="left-col">
            <div className="avatar-wrap">
              <img
                src={
                  avatarPreview
                    ? avatarPreview
                    : toAbsolute(user?.avatar?.url, API_BASE) || "/careerconnect-transparent.png"
                }
                alt="avatar"
                className="avatar"
              />
              <button className="btn" onClick={() => setIsAvatarOpen(true)} disabled={loading}>
                <FaImage /> Update Avatar
              </button>
            </div>

            <div className="quick-links">
              <Link to="/applications/me" className="btn-link">My Applications</Link>
              <Link to="/notifications" className="btn-link">Notifications</Link>
              <Link to="/interviews" className="btn-link">My Interviews</Link>
              <button className="btn-link" onClick={() => setIsResumeOpen(true)}>My Resume</button>
            </div>
          </div>

          {/* RIGHT: details */}
          <div className="right-col">
            <div className="profile-card">
              <p><strong><FaUser /> Name:</strong><span>{user?.name}</span></p>
              <p><strong><FaEnvelope /> Email:</strong><span>{user?.email}</span></p>
              <p><strong>OTP Verified:</strong><span>{user?.otpVerified ? 'Yes ✅' : 'No ❌'} <Link to="/verify-otp" style={{ marginLeft: 8, textDecoration: 'underline' }}>Verify</Link></span></p>
              <p><strong><FaPhone /> Phone:</strong><span>{user?.phone || "Not Provided"}</span></p>
              <p><strong><FaCalendarAlt /> Joined:</strong><span>{convertDateFormat(user?.createdAt)}</span></p>

              <div className="skills">
                <div className="skills-head">
                  <strong><FaIdBadge /> Skills:</strong>
                  <button className="btn-mini" onClick={() => setIsSkillsOpen(true)} disabled={loading}>Edit</button>
                </div>
                <div className="skill-chips">
                  {(user?.skills || []).length
                    ? user.skills.map((s, idx) => <span key={idx} className="chip">{s}</span>)
                    : <span className="muted">No skills added</span>}
                </div>
              </div>

              <div className="btn-group">
                <button onClick={() => setIsEditOpen(true)} className="btn-edit" disabled={loading}><FaUserEdit /> Edit Profile</button>
                <button onClick={() => setIsPasswordOpen(true)} className="btn-password" disabled={loading}><FaLock /> Change Password</button>
                <button onClick={handleDeleteAccount} className="btn-danger" disabled={loading}><FaTrash /> Delete Account</button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Modal: Edit Profile ===== */}
        {isEditOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile}>
                <div>
                  <label>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
                </div>

                <div>
                  <label>Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" pattern="[0-9 +()-]{7,}" />
                </div>

                <div>
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
                  <button type="button" onClick={() => setIsEditOpen(false)} className="btn-cancel" disabled={loading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Modal: Change Password ===== */}
        {isPasswordOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Change Password</h3>
              <form onSubmit={handleUpdatePassword}>
                <div>
                  <label>Old Password</label>
                  <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" required />
                </div>

                <div>
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" required />
                </div>

                <div>
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
                  <button type="button" onClick={() => setIsPasswordOpen(false)} className="btn-cancel" disabled={loading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Modal: Update Avatar ===== */}
        {isAvatarOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Update Avatar</h3>
              <form onSubmit={handleUploadAvatar}>
                <div>
                  <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                </div>
                {avatarPreview && (
                  <div>
                    <img src={avatarPreview} alt="preview" className="resume-img" style={{ maxHeight: 180 }} />
                  </div>
                )}
                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={loading}>{loading ? "Uploading..." : "Upload"}</button>
                  <button type="button" onClick={() => { setIsAvatarOpen(false); setAvatarFile(null); }} className="btn-cancel" disabled={loading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Modal: Resume (preview + upload) ===== */}
        {isResumeOpen && (
          <div className="modal">
            <div className="modal-content wide">
              <h3>Resume</h3>
              <div className="resume-preview">
                {resumePreview ? (
                  resumeFile?.type === "application/pdf" ? (
                    <iframe title="resume" src={resumePreview} className="resume-frame" />
                  ) : (
                    <img src={resumePreview} alt="resume" className="resume-img" />
                  )
                ) : user?.resume?.url ? (
                  /\.pdf$/i.test(user.resume.url) ? (
                    <iframe title="resume" src={toAbsolute(user.resume.url, API_BASE)} className="resume-frame" />
                  ) : (
                    <img src={toAbsolute(user.resume.url, API_BASE)} alt="resume" className="resume-img" />
                  )
                ) : (
                  <div className="muted">No resume uploaded</div>
                )}
              </div>
              <form onSubmit={handleUploadResume}>
                <div>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={loading}>{loading ? "Uploading..." : "Upload / Replace"}</button>
                  <button type="button" onClick={() => { setIsResumeOpen(false); setResumeFile(null); }} className="btn-cancel" disabled={loading}>Close</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Modal: Skills editor (متعدد داخل حقل واحد) ===== */}
        {isSkillsOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Skills</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateSkills(e);
                }}
              >
                <div>
                  <label>Add skill (Enter or comma, paste many)</label>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={onSkillInputKeyDown}
                    onPaste={onSkillInputPaste}
                    placeholder="e.g. React, Node.js, MongoDB"
                  />
                  <p className="muted" style={{ marginTop: ".35rem" }}>
                    {skills.length}/{MAX_SKILLS_COUNT} • Each ≤ {MAX_SKILL_LENGTH} chars
                  </p>
                </div>

                <div className="skill-chips" style={{ marginTop: ".5rem" }}>
                  {skills.length ? (
                    skills.map((s) => (
                      <span key={s} className="chip chip-removable">
                        {s}
                        <button
                          type="button"
                          className="chip-x"
                          onClick={() => removeSkill(s)}
                          aria-label={`remove ${s}`}
                          title="remove"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="muted">No skills yet — add some above</span>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Saving..." : "Save Skills"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSkillsOpen(false)}
                    className="btn-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* quick styles so it looks decent without Tailwind */}
      <style>{`
        .container{max-width:1100px;margin:0 auto;padding:1.25rem}
        .title{display:flex;gap:.5rem;align-items:center;font-size:1.75rem;margin:1rem 0}
        .profile-grid{display:grid;grid-template-columns:280px 1fr;gap:1.25rem}
        @media (max-width: 800px){.profile-grid{grid-template-columns:1fr}}
        .left-col{display:flex;flex-direction:column;gap:1rem}
        .avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1rem;border:1px solid #eee;border-radius:12px}
        .avatar{width:220px;height:220px;border-radius:50%;object-fit:cover;border:4px solid #f4f4f4}
        .quick-links{display:flex;flex-direction:column;gap:.5rem}
        .btn-link{display:block;text-align:center;padding:.6rem .9rem;border-radius:10px;background:#eef2ff;color:#1f3a8a;font-weight:600;text-decoration:none}
        .profile-card{padding:1rem 1.25rem;border:1px solid #eee;border-radius:12px;display:flex;flex-direction:column;gap:.5rem}
        .profile-card p{display:flex;gap:.5rem;align-items:center;justify-content:space-between;border-bottom:1px dashed #eee;padding:.25rem 0}
        .profile-card p span{font-weight:600}
        .skills{margin-top:.5rem}
        .skills-head{display:flex;align-items:center;gap:.6rem}
        .skill-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}
        .chip{background:#fde68a;color:#1f2937;padding:.25rem .5rem;border-radius:6px;font-size:.85rem;font-weight:700}
        .muted{color:#6b7280}
        .btn-group{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}
        .btn,.btn-edit,.btn-password,.btn-danger{padding:.6rem .9rem;border:none;border-radius:10px;cursor:pointer;font-weight:700}
        .btn{background:#e5e7eb}
        .btn-edit{background:#dbeafe;color:#1e3a8a}
        .btn-password{background:#ecfccb;color:#166534}
        .btn-danger{background:#fee2e2;color:#991b1b}
        .btn-mini{padding:.3rem .5rem;border-radius:6px;background:#f3f4f6;border:none;cursor:pointer}

        .modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;z-index:50}
        .modal-content{background:#fff;border-radius:12px;padding:1rem;min-width:min(520px,92vw);max-height:88vh;overflow:auto}
        .modal-content.wide{min-width:min(820px,96vw)}
        .modal-content h3{margin-bottom:.75rem}
        .modal-content form{display:flex;flex-direction:column;gap:.75rem}
        .modal-content label{display:block;font-weight:700;margin-bottom:.25rem}
        .modal-content input{width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px}
        .modal-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem}
        .btn-save{background:#111827;color:#fff;padding:.6rem .9rem;border-radius:10px;border:none}
        .btn-cancel{background:#e5e7eb;padding:.6rem .9rem;border-radius:10px;border:none}
        .resume-preview{border:1px solid #eee;border-radius:10px;overflow:hidden;margin-bottom:.75rem}
        .resume-frame{width:100%;height:70vh;border:0}
        .resume-img{display:block;max-width:100%}

        /* chips قابلة للحذف */
        .chip-removable{position:relative;padding-right:1.4rem}
        .chip-x{
          position:absolute;right:.25rem;top:50%;transform:translateY(-50%);
          background:transparent;border:0;cursor:pointer;font-weight:900;line-height:1;padding:0;opacity:.7
        }
        .chip-x:hover{opacity:1}
      `}</style>
    </section>
  );
};

export default Profile;
