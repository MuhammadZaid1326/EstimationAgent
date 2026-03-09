import { callAI, safeJsonParse } from "../services/aiService.js";

export async function riskAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a senior software risk analyst. Your task is to identify and assess risks for each software requirement provided. Be realistic and practical — focus on risks relevant to small-to-medium web applications.

[INPUT]:
Software requirements:
${requirements}

[ANALYSIS RULES]:
1. For each requirement, provide:
   - "requirement_id": string (e.g., "REQ-01")
   - "risk_title": short name for the risk
   - "risk_description": clear explanation of what could go wrong
   - "likelihood": "Low", "Medium", or "High"
   - "impact": "Low", "Medium", or "High"
   - "risk_level": overall rating — "Low", "Medium", "High", or "Critical"
   - "mitigation": concrete steps to reduce or eliminate the risk

2. Consider technical, operational, security, compliance, and resource-related risks.
3. Output must be strictly valid JSON array — no text outside JSON.

[OUTPUT FORMAT EXAMPLE]:
[
  {
    "requirement_id": "REQ-01",
    "risk_title": "Authentication Bypass",
    "risk_description": "Weak password policies may allow unauthorized access",
    "likelihood": "Medium",
    "impact": "High",
    "risk_level": "High",
    "mitigation": "Enforce strong password rules and implement MFA"
  }
]
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}