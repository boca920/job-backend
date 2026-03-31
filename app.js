import express from "express";
import dbConnection from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import interviewRouter from "./routes/interviewRoutes.js";
import { config } from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// ==================== CONFIG ====================
config({ path: "./config/config.env" });

// Handle __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== MIDDLEWARES ====================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ احذف express-fileupload نهائيًا (هو السبب في تضارب الرفع مع Multer)
// ❌  app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

// Debug headers لطلبات الرفع (اختياري لكن مفيد)
app.use((req, res, next) => {
  if (
    req.method === "PUT" &&
    (req.path.includes("/user/update-avatar") ||
      req.path.includes("/user/upload-resume"))
  ) {
    console.log("->", req.method, req.originalUrl);
    console.log("   Content-Type:", req.headers["content-type"]);
    console.log("   Content-Length:", req.headers["content-length"]);
  }
  next();
});

// Serve static files (uploaded images/pdfs) من المجلد المحلي
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==================== ROUTES ====================
app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/interview", interviewRouter);

// ==================== DATABASE CONNECTION ====================
dbConnection();

// ==================== ERROR HANDLER ====================
// لو عندك هاندلر بيغطي Multer كويس خليه كما هو. وإلا أضف لوج هنا.
app.use(errorMiddleware);

export default app;
