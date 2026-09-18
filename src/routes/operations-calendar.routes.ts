import { Router } from "express";
import { OperationsCalendarController } from "../controllers/operations-calendar.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new OperationsCalendarController();
const admins = requireAuth(["admin", "super_admin"]);
const operationsReaders = requireAuth(["admin", "super_admin", "coach", "staff", "receptionist"]);

router.get("/admin/calendar", operationsReaders, controller.list);
router.post("/admin/events", admins, controller.createEvent);
router.put("/admin/events/:id", admins, controller.updateEvent);
router.delete("/admin/events/:id", admins, controller.deleteEvent);
router.post("/admin/holidays", admins, controller.createHoliday);
router.put("/admin/holidays/:id", admins, controller.updateHoliday);
router.delete("/admin/holidays/:id", admins, controller.deleteHoliday);

export default router;
