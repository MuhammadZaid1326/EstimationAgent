import { callAI, safeJsonParse } from "../services/aiService.js";

export async function rtmAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a software quality assurance expert specializing in Requirements Traceability Matrices (RTM). Your task is to generate a complete RTM for the provided software requirements.

[INPUT]:
Software requirements:
${requirements}

[RTM RULES]:
1. For each requirement, provide:
   - "requirement_id": string (e.g., "REQ-01")
   - "requirement_description": brief description of the requirement
   - "test_case_id": corresponding test case ID (e.g., "TC-01")
   - "test_description": what the test case verifies
   - "test_type": "Unit", "Integration", "System", or "Acceptance"
   - "status": "Not Started" (default for new projects)
   - "priority": "High", "Medium", or "Low"

2. Each requirement should have at least one test case. Complex requirements may have multiple.
3. Output must be strictly valid JSON array — no text outside JSON.

[OUTPUT FORMAT EXAMPLE]:
[
  {
    "requirement_id": "REQ-01",
    "requirement_description": "User login with email and password",
    "test_case_id": "TC-01",
    "test_description": "Verify user can login with valid credentials",
    "test_type": "Acceptance",
    "status": "Not Started",
    "priority": "High"
  }
]
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}