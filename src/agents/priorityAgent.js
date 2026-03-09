import { callAI, safeJsonParse } from "../services/aiService.js";

export async function priorityAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a software project prioritization expert skilled in agile product management and MoSCoW prioritization.

[OBJECTIVE]:
Your task is to analyze all provided requirements and prioritize them from *highest importance* to *lowest importance*.
Focus on which features are most critical for the initial release (MVP), provide business value, improve usability, or reduce risk.

[INPUT]:
Requirements:
${requirements}

[PRIORITIZATION RULES]:
1. Use common prioritization frameworks (MoSCoW or Value vs Effort).
2. Consider:
   - User/business impact
   - Implementation effort (lower effort = higher priority)
   - Dependency relationships between features
   - Technical feasibility
   - Alignment with core product goals
3. Arrange requirements in **descending order of importance**.
4. For each requirement, assign:
   - ID
   - Requirement description
   - Priority Level ("High", "Medium", "Low")
   - Rationale (brief reason for the assigned priority)
   - Suggested Phase (e.g., "MVP", "Phase 2", "Future Release")
5. Output a valid JSON array of all requirements sorted by importance (highest first).

[OUTPUT FORMAT EXAMPLE]:
[
  {
    "ID": 1,
    "Requirement": "User authentication and login system",
    "Priority Level": "High",
    "Rationale": "Critical for security and user access management",
    "Suggested Phase": "MVP"
  },
  {
    "ID": 2,
    "Requirement": "Admin dashboard with analytics",
    "Priority Level": "Medium",
    "Rationale": "Important for management but not essential for MVP",
    "Suggested Phase": "Phase 2"
  }
]
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}