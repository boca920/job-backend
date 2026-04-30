// Navbar.jsx
import React, { useContext, useMemo, useState } from "react";
import { Context } from "../../main";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai";

/** يبني رابط مطلق لملفات السيرفر (مثل /uploads/...) */
const toAbsolute = (url, API_BASE) => {
  if (!url) return url;
  const lower = String(url).toLowerCase();
  const isAbs = lower.startsWith("http://") || lower.startsWith("https://");
  if (isAbs) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const Navbar = () => {
  const [show, setShow] = useState(false);
  const { isAuthorized, setIsAuthorized, setUser, user, API_BASE } = useContext(Context);
  const navigateTo = useNavigate();
  const location = useLocation();

  const avatarSrc = useMemo(() => {
    const fallback = "/careerconnect-transparent.png";
    if (!user?.avatar?.url) return fallback;
    return toAbsolute(user.avatar.url, API_BASE) || fallback;
  }, [user, API_BASE]);

  const closeMenu = () => setShow(false);

  const handleLogout = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/v1/user/logout`,
        { withCredentials: true }
      );
      toast.success(response.data.message || "Logged out");
      setIsAuthorized(false);
      setUser(null);
      closeMenu();
      navigateTo("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <nav className="navbarShow">
      <div className="container navContainer">
        <div className="brand">
          <Link to="/" onClick={closeMenu} className="brandLink">
            <img src="/careerconnect-white.png" alt="logo" className="logo" />
            <span className="brandText"></span>
          </Link>
        </div>

        <ul className={!show ? "menu" : "menu show-menu"}>
          <li>
            <Link
              to="/"
              onClick={closeMenu}
              className={isActive("/") ? "active" : ""}
            >
              HOME
            </Link>
          </li>

          <li>
            <Link
              to="/job/getall"
              onClick={closeMenu}
              className={isActive("/job/getall") ? "active" : ""}
            >
              ALL JOBS
            </Link>
          </li>

          {isAuthorized && (
            <li>
              <Link to="/notifications" onClick={closeMenu} className={isActive("/notifications") ? "active" : ""}>
                NOTIFICATIONS
              </Link>
            </li>
          )}

          {isAuthorized && (
            <li>
              <Link to="/interviews" onClick={closeMenu} className={isActive("/interviews") ? "active" : ""}>
                INTERVIEWS
              </Link>
            </li>
          )}

          {isAuthorized && (
            <li>
              <Link
                to="/applications/me"
                onClick={closeMenu}
                className={
                  isActive("/applications/me") ? "active" : ""
                }
              >
                {user?.role === "Employer"
                  ? "APPLICANT'S APPLICATIONS"
                  : "MY APPLICATIONS"}
              </Link>
            </li>
          )}

          {isAuthorized && user?.role === "Employer" && (
            <>
              <li>
                <Link
                  to="/job/post"
                  onClick={closeMenu}
                  className={isActive("/job/post") ? "active" : ""}
                >
                  POST NEW JOB
                </Link>
              </li>
              <li>
                <Link
                  to="/job/me"
                  onClick={closeMenu}
                  className={isActive("/job/me") ? "active" : ""}
                >
                  VIEW YOUR JOBS
                </Link>
              </li>
            </>
          )}

          {isAuthorized && (
            <li className="profileItem">
              <Link
                to="/Profile"
                onClick={closeMenu}
                className={
                  isActive("/Profile") ? "active profileLink" : "profileLink"
                }
                title="My Profile"
              >
                <img src={avatarSrc} alt="avatar" className="navAvatar" />
                <span className="profileText">MY PROFILE</span>
              </Link>
            </li>
          )}

          {isAuthorized ? (
            <li className="btnWrap">
              <button onClick={handleLogout} className="btn logoutBtn">
                LOGOUT
              </button>
            </li>
          ) : (
            <>
              <li className="btnWrap">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={`btn ${
                    isActive("/login") ? "primary" : "outline"
                  }`}
                >
                  LOGIN
                </Link>
              </li>
              <li className="btnWrap">
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className={`btn ${
                    isActive("/register") ? "primary" : "outline"
                  }`}
                >
                  REGISTER
                </Link>
              </li>
            </>
          )}
        </ul>

        <button
          className="hamburger"
          aria-label="Toggle Menu"
          onClick={() => setShow((s) => !s)}
        >
          {show ? <AiOutlineClose /> : <GiHamburgerMenu />}
        </button>
      </div>

      <style>{`
        .navContainer{
          max-width:1100px;
          margin:0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0.5rem 1rem;
          gap:0.75rem;
        }
        .brandLink{
          display:flex;
          align-items:center;
          gap:.5rem;
          text-decoration:none;
        }
        .logo{
          height:32px;
          width:auto;
          border-radius:50px;
        }
        .brandText{
          color:var(--pure-white);
          font-weight:800;
          letter-spacing:.3px;
        }
        .menu{
          display:flex;
          align-items:center;
          gap:1rem;
          list-style:none;
          margin:0;
          padding:0;
        }
        .show-menu{
          position:absolute;
          left:0;
          right:0;
          top:64px;
          background:var(--primary-dark);
          padding:1rem;
          flex-direction:column;
          align-items:flex-start;
          border-top:1px solid rgba(0,0,0,0.1);
        }
        .menu a{
          color:var(--background-light);
          text-decoration:none;
          font-weight:700;
          letter-spacing:.3px;
        }
        .menu a.active{
          color:#FFD700;
        }
        .hamburger{
          display:none;
          background:transparent;
          border:0;
          color:var(--pure-white);
          font-size:1.5rem;
          cursor:pointer;
        }
        .btnWrap{
          display:flex;
        }
        .btn{
          padding:.45rem .85rem;
          border-radius:10px;
          border:0;
          cursor:pointer;
          font-weight:800;
          letter-spacing:.3px;
          text-decoration:none;
        }
        .btn.primary{
          background:var(--primary-light);
          color:var(--pure-white);
        }
        .btn.outline{
          background:transparent;
          border:1px solid var(--pure-white);
          color:var(--pure-white);
        }
        .btn.logoutBtn{
          background:var(--error);
          color:var(--pure-white);
        }
        .profileItem{
          display:flex;
          align-items:center;
        }
        .profileLink{
          display:flex;
          align-items:center;
          gap:.5rem;
          text-decoration:none;
        }
        .navAvatar{
          width:28px;
          height:28px;
          border-radius:50%;
          object-fit:cover;
          border:2px solid rgba(255,255,255,0.2);
        }
        .profileText{
          color:var(--background-light);
          font-weight:700;
        }
        @media (max-width: 900px){
          .hamburger{display:block;}
          .menu{display:none;}
          .menu.show-menu{display:flex;}
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
