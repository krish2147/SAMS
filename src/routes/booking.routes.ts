import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const bookingController = new BookingController();

router.get("/bookings", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist", "member"]), bookingController.getAll);
router.post("/bookings", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist", "member"]), bookingController.create);

export default router;
