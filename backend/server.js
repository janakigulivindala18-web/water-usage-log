require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const logRoutes = require("./routes/logs");
const suggestionRoutes = require("./routes/suggestions");
const adminRoutes = require("./routes/admin");

const app = express();
const port = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use(helmet({contentSecurityPolicy:{directives:{
  defaultSrc:["'self'"], scriptSrc:["'self'"], styleSrc:["'self'","'unsafe-inline'"],
  imgSrc:["'self'","data:"], connectSrc:["'self'"], objectSrc:["'none'"], frameAncestors:["'none'"]
}}}));
app.use(cors({origin:false}));
app.use(express.json({limit:"20kb"}));
app.use("/api/auth", rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.get("/api/health", (_req,res)=>res.json({status:"ok",service:"WaterWise API"}));
app.use("/api/auth",authRoutes);
app.use("/api/logs",logRoutes);
app.use("/api/suggestions",suggestionRoutes);
app.use("/api/admin",adminRoutes);
app.use(express.static(path.join(__dirname,"..","frontend")));
app.use("/api",(req,res)=>res.status(404).json({error:"API route not found."}));
app.use((err,_req,res,_next)=>{
  if (err && err.type === "entity.parse.failed") return res.status(400).json({error:"Request body must be valid JSON."});
  if (err && err.type === "entity.too.large") return res.status(413).json({error:"Request body is too large."});
  console.error("Unexpected server error:", err && err.message);
  res.status(500).json({error:"An unexpected server error occurred."});
});
app.listen(port,()=>console.log(`WaterWise is running at http://localhost:${port}`));
