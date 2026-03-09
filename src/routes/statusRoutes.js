import { Router } from "express";
import { getJob } from "../services/jobService.js";

const router = Router();

/**
 * GET /status/:jobId
 *
 * Frontend polls this every few seconds after calling POST /analyze.
 *
 * Responses:
 *   queued      → { status: "queued" }
 *   processing  → { status: "processing" }
 *   complete    → { status: "complete", pdfUrl, downloadUrl }
 *   failed      → { status: "failed", error }
 *   not found   → 404
 */
router.get("/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Job not found. It may have expired or the ID is incorrect.",
    });
  }

  const response = { success: true, status: job.status };

  if (job.status === "complete") {
    response.pdfUrl = job.pdfUrl;
    response.downloadUrl = job.downloadUrl;
  }

  if (job.status === "failed") {
    response.error = job.error;
  }

  res.json(response);
});

export default router;