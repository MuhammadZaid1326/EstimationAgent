import { Router } from "express";
import { validateAnalyzeRequest } from "../middleware/requestValidator.js";
import { createJob, updateJob } from "../services/jobService.js";
import { generatePDF, mergeAndUpload } from "../services/pdfService.js";
import { sendReportEmail } from "../services/emailService.js";
import { config } from "../config/env.js";

import {
  costAgent,
  effortEstimationAgent,
  feasibilityAgent,
  priorityAgent,
  riskAgent,
  rtmAgent,
  srsAgent,
} from "../agents/index.js";

const router = Router();

// ===== POST /analyze =====
router.post("/", validateAnalyzeRequest, async (req, res) => {
  const { requirements, projectName, name, email } = req.body;

  const jobId = createJob();

  res.status(202).json({
    success: true,
    jobId,
    message: "Analysis started. Poll GET /status/:jobId for updates.",
  });

  runAnalysis({ jobId, requirements, projectName, name, email });
});

// ===== Background analysis runner =====
async function runAnalysis({ jobId, requirements, projectName, name, email }) {
  try {
    updateJob(jobId, { status: "processing" });
    console.log(`\n🚀 [Job ${jobId}] Analysis started for: ${projectName}`);
    console.log(`⚡ [Job ${jobId}] Running all 7 agents in parallel...`);

    // ===== Run all agents in parallel =====
    const agentTasks = [
      { label: "SRS",                  fn: () => srsAgent(requirements)              },
      { label: "RTM",                  fn: () => rtmAgent(requirements)              },
      { label: "Cost Analysis",        fn: () => costAgent(requirements)             },
      { label: "Feasibility Analysis", fn: () => feasibilityAgent(requirements)      },
      { label: "Risk Analysis",        fn: () => riskAgent(requirements)             },
      { label: "Priority Analysis",    fn: () => priorityAgent(requirements)         },
      { label: "Effort Estimation",    fn: () => effortEstimationAgent(requirements) },
    ];

    // Promise.allSettled — all agents run simultaneously, none blocks another
    // Even if one fails, the rest continue
    const results = await Promise.allSettled(
      agentTasks.map(async ({ label, fn }) => {
        console.log(`⚙️  [Job ${jobId}] Starting ${label}...`);
        const result = await fn();
        console.log(`✅ [Job ${jobId}] ${label} complete.`);
        return { label, result };
      })
    );

    // Unpack results — failed agents return null
    const getResult = (index) => {
      const outcome = results[index];
      if (outcome.status === "fulfilled") return outcome.value.result;
      console.error(`❌ [Job ${jobId}] ${agentTasks[index].label} failed: ${outcome.reason?.message}`);
      return null;
    };

    const srs              = getResult(0);
    const rtm              = getResult(1);
    const cost             = getResult(2);
    const feasibility      = getResult(3);
    const risk             = getResult(4);
    const priority         = getResult(5);
    const effortEstimation = getResult(6);

    const successCount = results.filter(r => r.status === "fulfilled").length;
    console.log(`📊 [Job ${jobId}] ${successCount}/7 agents completed successfully.`);

    // ===== Generate PDFs in parallel too =====
    console.log(`🧾 [Job ${jobId}] Generating PDFs in parallel...`);
    await Promise.all([
      generatePDF("Software Requirements Specification", srs,              projectName, jobId),
      generatePDF("Requirement Traceability Matrix",     rtm,              projectName, jobId),
      generatePDF("Cost Analysis",                       cost,             projectName, jobId),
      generatePDF("Feasibility Analysis",                feasibility,      projectName, jobId),
      generatePDF("Risk Analysis",                       risk,             projectName, jobId),
      generatePDF("Priority Analysis",                   priority,         projectName, jobId),
      generatePDF("Effort Estimation",                   effortEstimation, projectName, jobId),
    ]);

    // ===== Merge + upload to Cloudinary =====
    const cloudinaryUrl = await mergeAndUpload(jobId, projectName);

    // Build backend proxy URLs
    const baseUrl     = config.baseUrl;
    const viewUrl     = `${baseUrl}/view/${jobId}`;
    const downloadUrl = `${baseUrl}/download/${jobId}`;

    updateJob(jobId, {
      status:        "complete",
      pdfUrl:        viewUrl,
      downloadUrl:   downloadUrl,
      cloudinaryUrl: cloudinaryUrl,
    });

    console.log(`🎉 [Job ${jobId}] Complete.`);
    console.log(`   View:     ${viewUrl}`);
    console.log(`   Download: ${downloadUrl}`);

    await sendReportEmail(name, email, viewUrl, downloadUrl);
    console.log(`📩 [Job ${jobId}] Email sent to: ${email}`);

  } catch (err) {
    console.error(`❌ [Job ${jobId}] Fatal error:`, err.message);
    updateJob(jobId, { status: "failed", error: err.message });
  }
}

export default router;