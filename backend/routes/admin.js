const express = require("express");
const { db } = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();
router.get("/suggestions", requireAuth, requireAdmin, async (_req,res) => {
  const {data,error} = await db.from("suggestions").select("id,content,created_at,profiles(email)").order("created_at",{ascending:false}).limit(200);
  if (error) return res.status(500).json({error:"Could not load suggestions."});
  const suggestions = data.map(s => ({id:s.id,content:s.content,created_at:s.created_at,email:s.profiles?.email || "User"}));
  res.json({suggestions});
});
module.exports = router;
