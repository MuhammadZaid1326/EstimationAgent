import { Router } from "express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import { getJob } from "../services/jobService.js";

const router = Router();

// ===== Configure Cloudinary =====
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ===== Extract public_id from raw Cloudinary URL =====
function extractPublicId(rawUrl) {
  // Handles: /raw/upload/v123456/public_id  OR  /raw/upload/public_id
  const match = rawUrl.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) throw new Error(`Cannot extract public_id from: ${rawUrl}`);
  return match[1];
}

// ===== Stream PDF from a URL to the client =====
async function streamFromUrl(url, res, fileName, inline) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout:      30000,
    // Pass auth header as fallback
    headers: {
      "User-Agent": "PitchPilot/1.0",
    }
  });

  const disposition = inline
    ? `inline; filename="${fileName}"`
    : `attachment; filename="${fileName}"`;

  res.setHeader("Content-Type",        "application/pdf");
  res.setHeader("Content-Disposition", disposition);
  if (response.headers["content-length"]) {
    res.setHeader("Content-Length", response.headers["content-length"]);
  }

  response.data.pipe(res);
}

// ===== Main handler: try multiple URL strategies =====
async function servePdf(req, res, inline) {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found or expired." });
  }
  if (job.status !== "complete") {
    return res.status(409).json({ success: false, error: `Report not ready. Status: ${job.status}` });
  }
  if (!job.cloudinaryUrl) {
    return res.status(404).json({ success: false, error: "Report URL not found in job." });
  }

  configureCloudinary();
  const publicId  = extractPublicId(job.cloudinaryUrl);
  const fileName  = `PitchPilot_Report_${jobId}.pdf`;
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  // Strategy 1: signed URL with type=upload (most common)
  const signedUpload = cloudinary.url(publicId, {
    resource_type: "raw",
    type:          "upload",
    sign_url:      true,
    expires_at:    expiresAt,
    secure:        true,
  });

  // Strategy 2: signed URL with type=authenticated
  const signedAuth = cloudinary.url(publicId, {
    resource_type: "raw",
    type:          "authenticated",
    sign_url:      true,
    expires_at:    expiresAt,
    secure:        true,
  });

  // Strategy 3: raw URL as-is (works if truly public)
  const rawUrl = job.cloudinaryUrl;

  const strategies = [
    { label: "signed/upload",        url: signedUpload },
    { label: "signed/authenticated", url: signedAuth   },
    { label: "raw",                  url: rawUrl        },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🔄 Trying ${strategy.label}: ${strategy.url}`);
      await streamFromUrl(strategy.url, res, fileName, inline);
      console.log(`✅ Success with strategy: ${strategy.label}`);
      return; // done — piping started
    } catch (err) {
      console.warn(`⚠️  Strategy ${strategy.label} failed: HTTP ${err.response?.status} — ${err.message}`);
      if (res.headersSent) return; // already started sending, can't recover
    }
  }

  // All strategies failed
  if (!res.headersSent) {
    res.status(502).json({
      success: false,
      error:   "All delivery strategies failed. Check server logs.",
    });
  }
}

// ===== Routes =====
router.get("/view/:jobId",     (req, res) => servePdf(req, res, true));
router.get("/download/:jobId", (req, res) => servePdf(req, res, false));

export default router;