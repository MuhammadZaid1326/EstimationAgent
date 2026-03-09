import { callAI, safeJsonParse } from "../services/aiService.js";

export async function srsAgent(requirements) {
  const prompt = `
[SYSTEM ROLE]: You are a senior software architect and technical writer specializing in IEEE 830-compliant Software Requirements Specifications (SRS). Generate a complete, professional SRS document based on the provided requirements.

[INPUT]:
Software requirements:
${requirements}

[OUTPUT RULES]:
1. Generate a complete SRS document structured as a JSON object.
2. Follow IEEE 830 standard sections exactly.
3. Output must be strictly valid JSON — no text outside JSON.

[REQUIRED JSON STRUCTURE]:
{
  "Title": "Software Requirements Specification",
  "Version": "1.0 approved",
  "Prepared By": "PitchPilot AI",
  "Organization": "PitchPilot",
  "Date Created": "<today's date>",
  "Revision History": {
    "Name": "Initial Draft",
    "Date": "<today's date>",
    "Reason For Changes": "Initial SRS creation",
    "Version": "1.0"
  },
  "1. Introduction": {
    "1.1 Purpose": "...",
    "1.2 Intended Audience": "...",
    "1.3 Intended Use": "...",
    "1.4 Scope": "...",
    "1.5 Definitions and Acronyms": "..."
  },
  "2. Overall Description": {
    "2.1 User Needs": "...",
    "2.2 Assumptions and Dependencies": "..."
  },
  "3. External Interface Requirements": {
    "3.1 User Interfaces": "...",
    "3.2 Hardware Interfaces": "...",
    "3.3 Software Interfaces": "...",
    "3.4 Communication Interfaces": "..."
  },
  "4. System Features": "...",
  "5. Other Nonfunctional Requirements": {
    "5.1 Performance Requirements": "...",
    "5.2 Safety Requirements": "...",
    "5.3 Security Requirements": "...",
    "5.4 Software Quality Attributes": "..."
  },
  "6. Other Requirements": "...",
  "Appendix A: Glossary": "...",
  "Appendix B: Analysis Models": "...",
  "Appendix C: To Be Determined List": "..."
}
`;

  const response = await callAI(prompt);
  return safeJsonParse(response);
}