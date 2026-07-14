const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Import routes
const authRouter = require("./routes/authRoutes");
const dashboardRouter = require("./routes/dashboardRoutes");
const menuRouter = require("./routes/menuRoutes");
const orderRouter = require("./routes/orderRoutes");
const kasirRouter = require("./routes/kasirRoutes");

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet untuk security headers — CSP tidak diperlukan karena backend hanya melayani API
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS configuration
// FRONTEND_URL di .env diisi URL Vercel (bisa lebih dari satu, pisah koma)
// Contoh: FRONTEND_URL=https://berkesan.vercel.app,https://berkesan-coffee.vercel.app
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan request tanpa origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      // Izinkan semua subdomain *.vercel.app (preview deployments)
      /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// RATE LIMITING
// ============================================

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60, // 60 request per menit
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter untuk login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // 10 request per 15 menit
  skipSuccessfulRequests: true, // Hanya hitung failed request
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
});

// Apply rate limiters
app.use(generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ============================================
// REQUEST LOGGING (Development only)
// ============================================

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// HEALTH CHECK (for monitoring)
// ============================================

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ROUTES
// ============================================

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/menu", menuRouter);
app.use("/api/order", orderRouter);
app.use("/api/kasir", kasirRouter);

// ============================================
// 404 HANDLER (API only)
// ============================================

app.use("/api", (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found` 
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use(errorHandler);

module.exports = app;