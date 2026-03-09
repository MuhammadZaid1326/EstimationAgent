import dotenv from "dotenv";
dotenv.config();

const REQUIRED_VARS = [
  "AZURE_OPENAI_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "GMAIL_USER",
  "APP_PASSWORD",
  "SENDER_NAME",
  "BASE_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  console.log("✅ Environment variables validated.");
}

export const config = {
  port:    process.env.PORT2 || 5007,
  baseUrl: process.env.BASE_URL || "http://localhost:5007",
  azure: {
    key:        process.env.AZURE_OPENAI_KEY,
    endpoint:   process.env.AZURE_OPENAI_ENDPOINT?.trim(),
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  },
  email: {
    user:       process.env.GMAIL_USER,
    password:   process.env.APP_PASSWORD,
    senderName: process.env.SENDER_NAME,
  },
  cloudinary: {
    cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
    apiKey:     process.env.CLOUDINARY_API_KEY,
    apiSecret:  process.env.CLOUDINARY_API_SECRET,
  },
};