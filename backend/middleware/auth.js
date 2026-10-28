const { db } = require("../supabase");

async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    const { data, error } = await db.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    const { data: profile, error: profileError } = await db.from("profiles").select("id,email,role").eq("id", data.user.id).single();
    if (profileError || !profile) return res.status(403).json({ error: "Your user profile is not configured. Contact the administrator." });
    req.user = { id: data.user.id, email: data.user.email, role: profile.role };
    next();
  } catch (_) {
    return res.status(401).json({ error: "Could not verify your session. Please sign in again." });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Administrator access is required." });
  next();
}
module.exports = { requireAuth, requireAdmin };
