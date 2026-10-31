import { Router } from "express";
import { BatchController } from "../controllers/batch.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const batchController = new BatchController();

router.get("/batches", batchController.getAll);
router.get("/batches/:id", batchController.getById);

// Batch Management: everyone on the team can see batches; only admins change them.
router.get("/admin/batches/operations", requireAuth(["admin", "super_admin", "staff", "coach"]), batchController.getOperational);

router.post("/batches", requireAuth(["admin", "super_admin"]), batchController.create);
router.put("/batches/:id", requireAuth(["admin", "super_admin"]), batchController.update);
router.delete("/batches/:id", requireAuth(["admin", "super_admin"]), batchController.delete);

export default router;
