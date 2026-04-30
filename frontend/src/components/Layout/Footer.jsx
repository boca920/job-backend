// src/components/layout/Footer.jsx
import React from "react";
import { FaGithub, FaLinkedin, FaFacebook, FaTwitter } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";
import { RiInstagramFill } from "react-icons/ri";

function Footer() {
  return (
    <footer
      className="appFooter footerShow"
    >
      <div className="footerContent">
        {/* left: brand + copy */}
        <div className="footerBrand">
          <span className="footerLogo">Opporto</span>
          <span className="footerCopy">
            &copy; {new Date().getFullYear()} All Rights Reserved.
          </span>
        </div>

 

        {/* right: social icons */}
        <div className="footerSocial">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <FaGithub />
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <FaFacebook />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <FaTwitter />
          </a>
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <RiInstagramFill />
          </a>
          <a
            href="https://leetcode.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LeetCode"
          >
            <SiLeetcode />
          </a>
        </div>
      </div>

      <style>{`
        .appFooter {
          margin-top: auto;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(226, 232, 240, 0.35);
          backdrop-filter: blur(18px);
          background:
            radial-gradient(circle at top left,
              rgba(99, 102, 241, 0.18),
              transparent 55%
            ),
            radial-gradient(circle at bottom right,
              rgba(55, 48, 162, 0.28),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.96),
             );
          color: var(--background-light);
          font-size: 0.9rem;
          box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.25);
          z-index: 10;
        }

        .footerShow {
          display: block;
        }

        .footerHide {
          display: none;
        }

        .footerContent {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .footerBrand {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 180px;
        }

        .footerLogo {
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 0.95rem;
        }

        .footerCopy {
          opacity: 0.85;
        }

        .footerNav {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.25rem;
          justify-content: center;
          flex: 1;
        }

        .footerNav a {
          position: relative;
          color: var(--background-light);
          text-decoration: none;
          font-size: 0.86rem;
          opacity: 0.85;
          transition: opacity 0.2s ease, transform 0.2s ease;
          padding-bottom: 2px;
        }

        .footerNav a::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 2px;
          border-radius: 999px;
          background: var(--primary-light);
          transition: width 0.2s ease;
        }

        .footerNav a:hover {
          opacity: 1;
          transform: translateY(-1px);
        }

        .footerNav a:hover::after {
          width: 100%;
        }

        .footerSocial {
          display: flex;
          gap: 0.55rem;
        }

        .footerSocial a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.55);
          color: var(--background-light);
          text-decoration: none;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease,
            color 0.18s ease;
        }

        .footerSocial a:hover {
          transform: translateY(-2px) scale(1.03);
          background: var(--primary-light);
          color: var(--pure-white);
          box-shadow: var(--shadow-hover);
        }

        .footerSocial svg {
          font-size: 1.15rem;
        }

        @media (max-width: 900px) {
          .footerContent {
            flex-direction: column;
            align-items: flex-start;
          }

          .footerNav {
            justify-content: flex-start;
          }
        }

        @media (max-width: 520px) {
          .appFooter {
            padding: 0.9rem 1rem 1rem;
          }

          .footerContent {
            align-items: stretch;
          }

          .footerBrand {
            width: 100%;
          }

          .footerNav {
            width: 100%;
          }

          .footerSocial {
            margin-top: 0.3rem;
          }
        }
      `}</style>
      
    </footer>
  );
}

export default Footer;
