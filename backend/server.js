import "dotenv/config.js";
import app from "./index.js";

const PORT = Number(process.env.PORT) || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

/* Global Error Handlers */
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  server.close(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  server.close(() => process.exit(1));
});