import nodemailer from "nodemailer";
import { config } from "../config/env.js";

export async function sendReportEmail(name, toEmail, viewUrl, downloadUrl) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  const mailOptions = {
    from: `"${config.email.senderName}" <${config.email.user}>`,
    to: toEmail,
    subject: "🎉 Your PitchPilot AI Report is Ready!",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
        <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <h2 style="color:#4b0082; text-align:center; font-size: 24px; margin-bottom: 10px;">
            Dear <strong style="color:#6a0dad;">${name}</strong>!
          </h2>
          <p style="text-align:center; color:#555; font-size: 16px; margin-bottom: 25px;">
            Welcome to <strong>PitchPilot AI</strong> 🚀
          </p>

          <p style="font-size:15px; color:#333; line-height:1.6;">
            Your <strong>AI-driven project analysis report</strong> has been successfully generated.
          </p>

          <ul style="list-style-type: none; padding-left: 0; margin: 20px 0;">
            <li style="margin-bottom: 12px;">
              <a href="${viewUrl}" target="_blank"
                 style="color:#6a0dad; text-decoration:none; font-weight:bold;">🔗 View your report</a>
            </li>
            <li>
              <a href="${downloadUrl}" target="_blank"
                 style="color:#6a0dad; text-decoration:none; font-weight:bold;">⬇️ Download your report</a>
            </li>
          </ul>

          <p style="font-size:15px; color:#333; line-height:1.6;">
            If you have any questions, feel free to reply to this email.
          </p>

          <p style="margin-top:30px; color:#555; font-size:15px;">
            Best regards,<br/>
            <strong>The PitchPilot Team</strong>
          </p>
        </div>

        <p style="text-align:center; color:#999; font-size:12px; margin-top:25px;">
          This is an automated message from PitchPilot AI. Please do not reply directly.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
  } catch (error) {
    // Non-fatal — log but don't crash the job
    console.error("❌ Failed to send email:", error.message);
  }
}