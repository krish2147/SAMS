import dotenv from "dotenv";
dotenv.config();
import app from "./src/app-express";
import { getDbPool } from "./src/config/db";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";
import { validateRuntimeConfiguration } from "./src/config/runtime";
import { startNotificationWorker } from "./src/services/notification-worker.service";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  console.log("🚀 Starting Swimming Academy Membership System (SAMS) Backend...");
  validateRuntimeConfiguration();

  // 1. Ensure Connectivity to the MySQL Database Pool before opening sockets
  try {
    await getDbPool();
  } catch (err: any) {
    console.error("❌ CRITICAL DATABASE ERROR: Database connectivity check failed!");
    console.error(`Reason: ${err.message}`);
    console.error("SAMS cannot start without a relational MySQL database. Exiting process...");
    process.exit(1);
  }

  // 2. Setup Vite Development server or Production Static Fallback
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Starting SAMS in DEVELOPMENT mode (Vite Middleware)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("📦 Starting SAMS in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 3. Initiate Server Port Binding
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ SAMS application successfully running on http://localhost:${PORT}`);
    startNotificationWorker();
  });
}

startServer().catch((err) => {
  console.error("❌ CRITICAL: SAMS Bootstrapping Failed:", err);
  process.exit(1);
});
