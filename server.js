import express from "express";
import cors from "cors";

// ===== Config & validation (must be first) =====
import { validateEnv, config } from "./src/config/env.js";
validateEnv();

// ===== Routes =====
import analyzeRoutes from "./src/routes/analyzeRoutes.js";
import statusRoutes  from "./src/routes/statusRoutes.js";
import reportRoutes  from "./src/routes/reportRoutes.js";

// ===== Middleware =====
import { errorHandler } from "./src/middleware/errorHandler.js";

// ===== Job cleanup scheduler =====
import { startCleanupScheduler } from "./src/services/jobService.js";

const app = express();

// ===== Global middleware =====
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ===== API Routes =====
app.use("/analyze", analyzeRoutes);
app.use("/status",  statusRoutes);

// ✅ Mount at "/" so that /view/:jobId and /download/:jobId
// in reportRoutes.js match exactly — no double prefix
app.use("/", reportRoutes);

// ===== Global error handler (must be last) =====
app.use(errorHandler);

// ===== Start =====
app.listen(config.port, () => {
  console.log(`✅ PitchPilot server running on http://localhost:${config.port}`);
  startCleanupScheduler();
});