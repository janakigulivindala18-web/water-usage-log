const express = require("express");
const { db } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
const categories = ["Drinking","Cooking","Bathing","Laundry","Cleaning","Gardening","Dishwashing","Other"];
const fields = "id,user_id,category,litres,log_date,notes,created_at";
function validate(body) {
  if (!body || !categories.includes(body.category)) return "Choose a valid activity category.";
  if (typeof body.litres !== "number" || !Number.isFinite(body.litres) || body.litres < 0.1 || body.litres > 100000) return "Amount must be between 0.1 and 100,000 litres.";
  if (typeof body.log_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.log_date) || Number.isNaN(Date.parse(`${body.log_date}T00:00:00Z`))) return "Enter a valid date.";
  if (body.log_date > new Date().toISOString().slice(0,10)) return "Date cannot be in the future.";
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 240)) return "Notes must be 240 characters or fewer.";
  return null;
}
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await db.from("water_logs").select(fields).eq("user_id", req.user.id).order("log_date",{ascending:false}).order("created_at",{ascending:false}).limit(500);
  if (error) return res.status(500).json({ error: "Could not load water logs." });
  res.json({ logs: data });
});
router.post("/", requireAuth, async (req, res) => {
  const invalid = validate(req.body); if (invalid) return res.status(400).json({ error: invalid });
  const payload = { user_id:req.user.id, category:req.body.category, litres:req.body.litres, log_date:req.body.log_date, notes:(req.body.notes || "").trim() || null };
  const { data, error } = await db.from("water_logs").insert(payload).select(fields).single();
  if (error) return res.status(500).json({ error: "Could not save this water log." });
  res.status(201).json({ log:data });
});
router.delete("/:id", requireAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid water log ID." });
  const { data, error } = await db.from("water_logs").delete().eq("id",req.params.id).eq("user_id",req.user.id).select("id").maybeSingle();
  if (error) return res.status(500).json({ error: "Could not delete this water log." });
  if (!data) return res.status(404).json({ error: "Water log not found." });
  res.json({ message:"Water log deleted." });
});
module.exports = router;
