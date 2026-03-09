import { callAI, safeJsonParse } from "../services/aiService.js";

export async function effortEstimationAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a software project effort estimation expert experienced in agile methodologies and AI-assisted development. Your job is to provide *realistic and client-friendly* effort estimations (in hours and complexity) for each user story, assuming a small-to-medium scale web application.

[INPUT]:
Requirements:
${requirements}

[ESTIMATION RULES]:
1. For each user story, estimate:
   - ID
   - Description (user story)
   - Role(s) involved (Frontend, Backend, Fullstack, QA, UX, Solution Architect, DB Engineer, AI Engineer etc.)
   - Estimated hours for each role (considering AI-assisted coding reduces time by ~70–80%)
   - Complexity level ("Low", "Medium", "High")
   - Dependencies (if any)
   - Justification for the estimated effort

2. Assume team members are multitasking in small startups — one developer might handle multiple roles.
3. Do NOT include cost or currency here. Focus only on *time, complexity, and reasoning*.
4. Be realistic — favor the client's interest. Keep estimations concise yet plausible.
5. Output must be a **valid JSON array**, one object per user story.
6. At the end, include one summary object:
   - Total estimated hours (sum of all user story efforts)
   - Role-wise effort breakdown (how many hours total per role)
   - Average complexity level

[OUTPUT FORMAT]:
[
  {
    "ID 1": "Requirement 1",
    "Role": "Backend Developer, QA Engineer",
    "Estimated Hours": "2, 1",
    "Complexity": "Medium",
    "Dependencies": "Database setup",
    "Justification": "Simple backend logic and minor testing required."
  },
  {
    "Total Estimated Hours": 3,
    "Role-wise Breakdown": {
      "Backend Developer": 2,
      "QA Engineer": 1,
      "Frontend Developer": 1
    },
    "Average Complexity": "Low-Medium"
  }
]
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}