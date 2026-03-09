import { callAI, safeJsonParse } from "../services/aiService.js";

export async function feasibilityAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a software feasibility analysis expert. Your task is to provide realistic, detailed feasibility analysis per software requirement. Focus on clarity, actionable insights, and practical blockers. Do not be too strict to analyze. keep things easy.

[INPUT]:
Software requirements:
${requirements}

[ANALYSIS RULES]:
1. For each requirement, provide:
   - "requirement_id": string (e.g., "REQ-01")
   - "feasibility": one of "Feasible", "Not Feasible", or "Partially Feasible"
   - "blockers": list of specific blockers (technical, resource, time, budget, etc.) due to which you think it is not feasible else if feasible Nill
   - "recommendations": practical, actionable suggestions to resolve blockers or improve feasibility

2. Assess feasibility realistically for small to medium web applications. Consider:
   - Complexity of implementation
   - Resource availability (developers, AI tools, infrastructure)
   - Budget and time constraints
   - Dependencies on external systems or third-party services
   - Consider risks involved in the requirements

3. Output must be strictly JSON. Do not include commentary, explanations, or any text outside JSON.

[OUTPUT FORMAT EXAMPLE]:
[
  {
    "requirement_id": "REQ-01",
    "feasibility": "Feasible",
    "blockers": "None",
    "recommendations": "Proceed as planned"
  },
  {
    "requirement_id": "REQ-02",
    "feasibility": "Partially Feasible",
    "blockers": "Requires API integration not yet available",
    "recommendations": "Consider developing mock APIs or delaying this feature"
  }
]

[FINAL NOTE]: Return a JSON array covering all requirements. Each requirement must be evaluated individually.
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}