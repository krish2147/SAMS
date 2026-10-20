import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new AnalyticsController();

// Both return member data, so they need a signed-in staff account (they were open to anyone).
const STAFF = ["super_admin", "admin", "staff", "receptionist", "coach"];
router.get("/admin/analytics", requireAuth(STAFF), (req, res) => controller.getAnalytics(req, res));
router.get("/search/global", requireAuth(STAFF), (req, res) => controller.globalSearch(req, res));

export default router;

