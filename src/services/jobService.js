import { randomUUID } from "crypto";

/**
 * In-memory job store.
 * Each job: { id, status, createdAt, pdfUrl, downloadUrl, error }
 *
 * Status flow: "queued" → "processing" → "complete" | "failed"
 *
 * For multi-instance deployments, replace this Map with Redis.
 */
const jobs = new Map();

const JOB_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ===== Create a new job =====
export function createJob() {
  const id = randomUUID();
  jobs.set(id, {
    id,
    status: "queued",
    createdAt: Date.now(),
    pdfUrl: null,
    downloadUrl: null,
    error: null,
  });
  return id;
}

// ===== Update job status =====
export function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.set(jobId, { ...job, ...updates });
}

// ===== Get job by ID =====
export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

// ===== Cleanup expired jobs (called on interval) =====
export function cleanupExpiredJobs() {
  const now = Date.now();
  let count = 0;
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
      count++;
    }
  }
  if (count > 0) console.log(`🧹 Cleaned up ${count} expired job(s).`);
}

// ===== Start cleanup interval =====
export function startCleanupScheduler() {
  setInterval(cleanupExpiredJobs, 60 * 60 * 1000); // every hour
  console.log("🕐 Job cleanup scheduler started (runs every 1 hour).");
}