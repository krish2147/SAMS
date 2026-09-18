import { Router } from "express";
import { MemberController } from "../controllers/member.controller";
import { requireAuth } from "../middleware/authMiddleware";
import { upload } from "../config/multer";

const router = Router();
const memberController = new MemberController();

// Registration
router.post("/register", upload.single("photo"), memberController.register);
router.post("/members/register", memberController.directRegister);

// Member Profiles & Lookup
router.get("/members", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist"]), memberController.getAll);
router.post("/members/update-profile", memberController.updateProfile);
router.get("/members/profile/:membershipNo", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist"]), memberController.getProfile);
router.get("/members/dashboard/:membershipNo", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist"]), memberController.getDashboard);
router.get("/members/admin/stats", requireAuth(["admin", "super_admin"]), memberController.getAdminStats);

// Workflows & Admin Management
router.post("/members/approve", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.approve);
router.post("/members/resend-whatsapp", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.resendWhatsApp);
router.post("/members/reject", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.reject);
router.post("/members/pay", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.pay);
router.post("/members/delete-batch", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.deleteBatch);
router.delete("/members/:membershipNo", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.delete);

// SAMS Advanced Actions
router.post("/members/assign-batch/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.assignBatch);
router.post("/members/change-membership/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.changeMembership);
router.post("/members/change-batch/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.changeBatch);
router.post("/members/suspend/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.suspend);
router.post("/members/activate/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.activate);
router.post("/members/deactivate/:membershipNo", requireAuth(["admin", "super_admin"]), memberController.deactivate);

// SAMS Lobby Attendance
router.get("/attendance", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), memberController.getAttendanceLogs);
router.post("/attendance/checkin", requireAuth(["admin", "super_admin", "staff", "receptionist"]), memberController.checkInMember);
router.post("/attendance/scan-qr", requireAuth(["admin", "super_admin", "staff", "receptionist", "coach"]), memberController.scanQrCode);

// Member coaching notes
router.post("/members/:membershipNo/notes", requireAuth(["admin", "super_admin", "coach", "staff", "receptionist"]), memberController.updateNotes);

export default router;
