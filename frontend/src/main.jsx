import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import axios from "axios";

// ===== API base (يدعم env) =====
export const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  "http://localhost:4000";

// ===== axios instance مشترك =====
export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});

// ⚠️ مهم: إزالة أي هيدرز افتراضية ممكن تكسر الـmultipart
// خصوصًا Content-Type على مستوى axios العام أو الـinstance
delete axios.defaults.headers?.common?.["Content-Type"];
delete axios.defaults.headers?.post;
delete axios.defaults.headers?.put;

if (api?.defaults?.headers) {
  delete api.defaults.headers.common?.["Content-Type"];
  delete api.defaults.headers.post;
  delete api.defaults.headers.put;
}

// ===== السياق العام للتطبيق =====
export const Context = createContext({
  isAuthorized: false,
  setIsAuthorized: () => {},
  user: null,
  setUser: () => {},
  api,       // لتسهيل الاستدعاء في أي كومبوننت
  API_BASE,  // لو احتجت تحويل روابط نسبية إلى مطلقة
});

const AppWrapper = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState(null); // مبدئيًا null أفضل من {}

  return (
    <Context.Provider
      value={{
        isAuthorized,
        setIsAuthorized,
        user,
        setUser,
        api,
        API_BASE,
      }}
    >
      <App />
    </Context.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
