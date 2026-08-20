import express from "express";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { uploadsDir } from "./config/multer";
import { getDbPool, isMockDatabase } from "./config/db";
import { getObject, objectStorageEnabled } from "./services/object-storage.service";

const app = express();

const configuredOrigins = (process.env.ALLOWED_ORIGINS || process.env.APP_URL || process.env.APP_BASE_URL || "")
  .split(",")
  .map(origin => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// CORS and baseline browser security headers
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowDevelopmentOrigin = process.env.NODE_ENV !== "production" && Boolean(requestOrigin?.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/));
  if (requestOrigin && (configuredOrigins.includes(requestOrigin.replace(/\/+$/, "")) || allowDevelopmentOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-token");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve durable Spaces objects in production and local files in development.
if (objectStorageEnabled()) {
  app.get("/uploads/*", async (req, res, next) => {
    try {
      const key = String(req.params[0] || "");
      if (!key || key.includes("..")) return res.status(400).json({ error: "Invalid upload path." });
      const storedObject = await getObject(key);
      if (!storedObject) return res.status(404).json({ error: "File not found." });
      res.setHeader("Content-Type", storedObject.contentType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.send(storedObject.body);
    } catch (err) {
      next(err);
    }
  });
} else {
  app.use("/uploads", express.static(uploadsDir));
}

// Register API routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    const pool = await getDbPool();
    if (!isMockDatabase()) await pool.query("SELECT 1");
    res.json({ status: "ok", database: isMockDatabase() ? "mock" : "mysql", time: new Date() });
  } catch (_err) {
    res.status(503).json({ status: "unavailable", database: "disconnected", time: new Date() });
  }
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
