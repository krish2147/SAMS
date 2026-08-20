import { Router } from "express";
import { PlanController } from "../controllers/plan.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const planController = new PlanController();

router.get("/membership-plans", planController.getAll);
router.get("/membership-plans/:id", planController.getById);

router.post("/membership-plans", requireAuth(["admin", "super_admin"]), planController.create);
router.put("/membership-plans/:id", requireAuth(["admin", "super_admin"]), planController.update);
router.delete("/membership-plans/:id", requireAuth(["admin", "super_admin"]), planController.delete);

export default router;
