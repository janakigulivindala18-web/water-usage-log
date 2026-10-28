const express = require("express");
const { authClient, db } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

function validCredentials(email, password) {
  return typeof email === "string" && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    typeof password === "string" && password.length >= 8 && password.length <= 128;
}
router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!validCredentials(email, password)) return res.status(400).json({ error: "Enter a valid email and a password between 8 and 128 characters." });
  try {
    const { data, error } = await authClient.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) return res.status(400).json({ error: error.message });
    if (!data.session) return res.status(201).json({ message: "Account created. Confirm your email if confirmation is enabled, then sign in." });
    return res.status(201).json({ access_token: data.session.access_token, user: { id: data.user.id, email: data.user.email } });
  } catch (_) { return res.status(500).json({ error: "Could not create your account. Please try again." }); }
});
router.post("/signin", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) return res.status(400).json({ error: "Email and password are required." });
  try {
    const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.session) return res.status(401).json({ error: "Email or password is incorrect." });
    // Ensure the profile trigger has created the user's application profile.
    const { data: profile } = await db.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!profile) return res.status(403).json({ error: "Your profile is not ready. Contact the administrator." });
    return res.json({ access_token: data.session.access_token, user: { id: data.user.id, email: data.user.email } });
  } catch (_) { return res.status(500).json({ error: "Could not sign in. Please try again." }); }
});
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
module.exports = router;
