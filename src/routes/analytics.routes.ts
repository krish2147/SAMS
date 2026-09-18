import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";

const router = Router();
const controller = new AnalyticsController();

router.get("/admin/analytics", (req, res) => controller.getAnalytics(req, res));
router.get("/search/global", (req, res) => controller.globalSearch(req, res));

export default router;

