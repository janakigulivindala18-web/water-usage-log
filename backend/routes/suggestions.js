const express = require("express");
const { db } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
router.post("/", requireAuth, async (req,res) => {
  const content = req.body && req.body.content;
  if (typeof content !== "string" || content.trim().length < 5 || content.trim().length > 500) return res.status(400).json({error:"Suggestion must contain 5 to 500 characters."});
  const { error } = await db.from("suggestions").insert({user_id:req.user.id,content:content.trim()});
  if (error) return res.status(500).json({error:"Could not submit your suggestion."});
  res.status(201).json({message:"Suggestion submitted."});
});
module.exports = router;
