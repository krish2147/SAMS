import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new PaymentController();

// 1. Standard Public Razorpay Checkout Endpoints
router.post("/create-order", requireAuth(["super_admin", "admin"]), controller.createStandardOrder);
router.post("/verify-payment", controller.verifyStandardPayment);
router.get("/payments/checkout/:orderId", controller.getCheckout);

// 2. Payments Dashboard & Transactions List
router.get("/payments/dashboard", requireAuth(["super_admin", "admin", "staff", "receptionist"]), controller.getDashboard);
router.get("/admin/payments", requireAuth(["super_admin", "admin", "staff", "receptionist"]), controller.getDashboard);

// 3. Create Order / Payment Link
router.post("/payments/create-link", requireAuth(["super_admin", "admin"]), controller.sendLink);
router.post("/admin/payments/create-order", requireAuth(["super_admin", "admin"]), controller.createOrder);
router.post("/admin/payments/send-link", requireAuth(["super_admin", "admin"]), controller.sendLink);

// 4. Verify Payment
router.post("/payments/verify", controller.verifyPayment);
router.post("/admin/payments/verify", requireAuth(["super_admin", "admin"]), controller.verifyPayment);

// 5. Razorpay Webhook
router.post("/payments/webhook", controller.webhook);
router.post("/webhook/razorpay", controller.webhook);

// 6. Process Refund
router.post("/payments/refund", requireAuth(["super_admin", "admin"]), controller.processRefund);
router.post("/admin/payments/refund", requireAuth(["super_admin", "admin"]), controller.processRefund);

// 7. Retry Payment
router.post("/payments/retry", requireAuth(["super_admin", "admin"]), controller.retryPayment);
router.post("/admin/payments/retry", requireAuth(["super_admin", "admin"]), controller.retryPayment);

// 8. Financial Reports
router.get("/payments/reports", requireAuth(["super_admin", "admin"]), controller.getReports);
router.get("/admin/payments/reports", requireAuth(["super_admin", "admin"]), controller.getReports);

// 9. Single Payment / Member Payments / Receipts / Invoices
router.get("/payments/receipt/:id", controller.getReceipt);
router.get("/payments/invoice/:id", controller.getInvoice);
router.get("/payments/:id/receipt", controller.getReceipt);
router.get("/payments/:id/invoice", controller.getInvoice);
router.get("/admin/payments/:id/receipt", controller.getReceipt);
router.get("/admin/payments/:id/invoice", controller.getInvoice);

// 10. Resend Invoice & Receipts
router.post("/payments/:id/resend-invoice", requireAuth(["super_admin", "admin"]), controller.resendInvoice);
router.post("/admin/payments/:id/resend-invoice", requireAuth(["super_admin", "admin"]), controller.resendInvoice);
router.post("/payments/:id/send-whatsapp", requireAuth(["super_admin", "admin"]), (req, res, next) => { req.body = { ...req.body, channel: "whatsapp" }; controller.resendInvoice(req, res, next); });
router.post("/payments/:id/send-email", requireAuth(["super_admin", "admin"]), (req, res, next) => { req.body = { ...req.body, channel: "email" }; controller.resendInvoice(req, res, next); });

router.get("/payments/:id", requireAuth(["super_admin", "admin", "staff", "receptionist"]), controller.getPaymentById);
router.get("/members/:id/payments", requireAuth(["super_admin", "admin", "staff", "receptionist"]), controller.getMemberPayments);

export default router;
