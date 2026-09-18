import { Router } from "express";
import userRoutes from "./user.routes";
import memberRoutes from "./member.routes";
import bookingRoutes from "./booking.routes";
import planRoutes from "./plan.routes";
import batchRoutes from "./batch.routes";
import memberDashboardRoutes from "./member-dashboard.routes";
import paymentRoutes from "./payment.routes";
import communicationRoutes from "./communication.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

// Combine routes
router.use(userRoutes);
router.use(memberRoutes);
router.use(bookingRoutes);
router.use(planRoutes);
router.use(batchRoutes);
router.use(memberDashboardRoutes);
router.use(paymentRoutes);
router.use(communicationRoutes);
router.use(analyticsRoutes);

// Catch-all 404 for unhandled API endpoints to prevent falling through to Vite index.html
router.use("*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

export default router;
