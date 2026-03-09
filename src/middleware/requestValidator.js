/**
 * Validates the body of POST /analyze requests.
 * Ensures requirements, projectName, name, and email are present and valid.
 */
export function validateAnalyzeRequest(req, res, next) {
  const { requirements, projectName, name, email } = req.body;

  const errors = [];

  // --- requirements ---
  if (!requirements) {
    errors.push("'requirements' is required.");
  } else {
    const reqs = Array.isArray(requirements)
      ? requirements.join("\n")
      : requirements;
    if (typeof reqs !== "string" || reqs.trim().length < 10) {
      errors.push("'requirements' must be a non-empty string or array (min 10 chars).");
    }
  }

  // --- projectName ---
  if (!projectName || typeof projectName !== "string" || projectName.trim().length === 0) {
    errors.push("'projectName' is required and must be a non-empty string.");
  }

  // --- name ---
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("'name' is required (recipient name for email).");
  }

  // --- email ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("'email' is required and must be a valid email address.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Normalize requirements to string on the request body for downstream use
  req.body.requirements = Array.isArray(requirements)
    ? requirements.join("\n")
    : requirements;

  next();
}