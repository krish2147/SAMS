import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const userController = new UserController();

// Auth Endpoints
router.post("/auth/otp/send", userController.sendOtp);
router.post("/members/login", userController.login);
router.post("/auth/verify", userController.verify);
router.post("/auth/logout", userController.logout);

// Staff Directory Management (Admin / Super Admin ONLY for modification, read-only allowed for other staff)
router.get("/staff", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), userController.getAllStaff);
router.post("/staff/register", requireAuth(["admin", "super_admin"]), userController.registerStaff);
router.delete("/staff/:id", requireAuth(["admin", "super_admin"]), userController.deleteStaff);
router.post("/staff/update-profile", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), userController.updateProfile);
router.post("/staff/update-password", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), userController.updatePassword);

// Activities feed for admin panel
router.get("/activities", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), userController.getActivities);

// Renewals list for admin panel
router.get("/admin/renewals", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), userController.getRenewalsList);

// Coach Dashboard Unified real-DB endpoint
router.get("/coach/dashboard-data", requireAuth(["coach", "admin", "super_admin"]), userController.getCoachDashboardData);

export default router;
