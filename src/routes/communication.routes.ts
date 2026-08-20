import { Router } from "express";
import {
  handleGetLogs,
  handleGetTemplates,
  handleUpdateTemplate,
  handleSendBulk,
  handleRetryLog,
  handleGetStats,
  handleTestTrigger
} from "../controllers/communication.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/admin/communication/logs", requireAuth(["super_admin", "admin", "staff", "receptionist"]), handleGetLogs);
router.get("/admin/communication/templates", requireAuth(["super_admin", "admin", "staff", "receptionist"]), handleGetTemplates);
router.put("/admin/communication/templates/:eventKey", requireAuth(["super_admin", "admin"]), handleUpdateTemplate);
router.post("/admin/communication/send-bulk", requireAuth(["super_admin", "admin", "staff"]), handleSendBulk);
router.post("/admin/communication/retry-log/:id", requireAuth(["super_admin", "admin"]), handleRetryLog);
router.get("/admin/communication/stats", requireAuth(["super_admin", "admin", "staff"]), handleGetStats);
router.post("/admin/communication/test-trigger", requireAuth(["super_admin", "admin"]), handleTestTrigger);

export default router;
