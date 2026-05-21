const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const authRouter = require("./routes/authRoutes");
const dashboardRouter = require("./routes/dashboardRoutes");
const menuRouter = require("./routes/menuRoutes");
const orderRouter = require("./routes/orderRoutes");
const kasirRouter = require("./routes/kasirRoutes");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

// Bypass ngrok browser warning
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// Rate limiting sederhana: max 60 request/menit per IP
const rateMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60000) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > 60) return res.status(429).json({ success: false, message: "Too many requests" });
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/menu", menuRouter);
app.use("/api/order", orderRouter);
app.use("/api/orders", orderRouter);
app.use("/api/kasir", kasirRouter);

app.get("/", (req, res) => res.json({ status: "ok", message: "Berkesan API" }));

app.use((req, res) => res.status(404).json({ success: false, message: "Not Found" }));

module.exports = app;
