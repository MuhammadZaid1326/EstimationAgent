import { config } from "../config/env.js";
import OpenAI from "openai";

/**
 * Azure OpenAI Client (GPT-4o)
 */
const client = new OpenAI({
  apiKey: config.azure.key,
  baseURL: `${config.azure.endpoint}/openai/deployments/${config.azure.deployment}`,
  defaultQuery: { "api-version": "2024-02-15-preview" },
  defaultHeaders: {
    "api-key": config.azure.key,
  },
});

/**
 * Call Azure OpenAI GPT-4o.
 * @param {string} prompt
 * @param {string} agentType - used for logging only
 */
export async function callAI(prompt, agentType = "default") {
  try {
    const response = await client.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error(`❌ Azure OpenAI Error (${agentType}):`, err.message);
    throw new Error(`Azure OpenAI request failed for agent: ${agentType}`);
  }
}

// Backward-compat alias — remove once all agents are updated
export const callGemini = callAI;

/**
 * Safely parse model output into JSON.
 * Strips markdown code fences before parsing.
 */
export function safeJsonParse(text) {
  try {
    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) cleaned = match[0];

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON parse failed. Raw output:", text);
    return text; // return raw string so PDF generation can still handle it
  }
}