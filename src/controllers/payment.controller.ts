import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";

const paymentService = new PaymentService();

export class PaymentController {
  async getCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.getPaymentById(req.params.orderId);
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        return res.status(503).json({ error: "Razorpay checkout is not configured." });
      }

      res.json({
        success: true,
        checkout: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          amountInPaise: Math.round(payment.amount * 100),
          currency: "INR",
          keyId,
          memberName: payment.memberName,
          membershipNo: payment.membershipNo,
          mobileNo: payment.mobileNo,
          email: payment.email,
          planName: payment.planName,
          status: payment.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFilter, startDate, endDate, search, status } = req.query;

      const data = await paymentService.getDashboardData({
        dateFilter: dateFilter as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        status: status as string
      });

      res.json({
        success: true,
        summary: data.summary,
        transactions: data.transactions
      });
    } catch (err) {
      next(err);
    }
  }

  async createStandardOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, currency, receipt, notes, memberId, membershipNo } = req.body;
      if (amount === undefined || amount === null) {
        return res.status(400).json({ error: "Amount is required (minimum 100 paise)." });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 100) {
        return res.status(400).json({ error: "Amount must be at least 100 paise (₹1)." });
      }

      const result = await paymentService.createStandardOrder({
        amount: numAmount,
        currency,
        receipt,
        notes,
        memberId: memberId ? Number(memberId) : undefined,
        membershipNo
      });

      return res.json(result);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.message || "Failed to create order" });
    }
  }

  async verifyStandardPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const razorpay_order_id = req.body.razorpay_order_id || req.body.order_id;
      const razorpay_payment_id = req.body.razorpay_payment_id || req.body.payment_id;
      const razorpay_signature = req.body.razorpay_signature || req.body.signature;
      const { memberId, paymentId } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ error: "Missing required verification fields: razorpay_order_id and razorpay_payment_id are required." });
      }

      const result = await paymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        memberId: memberId ? Number(memberId) : undefined,
        paymentId: paymentId ? Number(paymentId) : undefined,
        approvedBy: "Razorpay Standard Checkout"
      });

      return res.json(result);
    } catch (err: any) {
      const status = err.status || 400;
      return res.status(status).json({ error: err.message || "Payment signature verification failed." });
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId, membershipNo, paymentType, amount, registrationFee, renewalFee } = req.body;
      const user = (req as any).user;

      const result = await paymentService.createRazorpayOrder({
        memberId: Number(memberId || 0),
        membershipNo: membershipNo || "",
        paymentType,
        amount: Number(amount || 0),
        registrationFee: Number(registrationFee || 0),
        renewalFee: Number(renewalFee || 0),
        approvedBy: user?.username || user?.fullName || "Admin"
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async sendLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId, memberId, membershipNo, channel } = req.body;
      const user = (req as any).user;

      const result = await paymentService.sendPaymentLink({
        paymentId: paymentId ? Number(paymentId) : undefined,
        memberId: memberId ? Number(memberId) : undefined,
        membershipNo,
        channel,
        approvedBy: user?.username || user?.fullName || "Admin"
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, memberId, paymentId } = req.body;
      const user = (req as any).user;

      const result = await paymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        memberId: memberId ? Number(memberId) : undefined,
        paymentId: paymentId ? Number(paymentId) : undefined,
        approvedBy: user?.username || user?.fullName || "Razorpay Checkout"
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = (req as any).rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      const signature = req.headers["x-razorpay-signature"] as string | undefined;

      const result = await paymentService.handleWebhook(rawBody, signature);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("Razorpay Webhook Error:", err.message);
      const status = Number(err.status) || 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }

  async processRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId, refundAmount, reason } = req.body;
      const user = (req as any).user;

      if (user?.role && user.role !== "super_admin" && user.role !== "admin") {
        return res.status(403).json({ error: "Only Admin or Super Admin is authorized to issue payment refunds." });
      }

      const result = await paymentService.processRefund({
        paymentId: Number(paymentId),
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        reason,
        approvedBy: user?.username || user?.fullName || "Admin"
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async retryPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.body;
      const user = (req as any).user;

      const result = await paymentService.retryPayment(
        Number(paymentId),
        user?.username || user?.fullName || "Admin"
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentService.getReportsData();
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await paymentService.getPaymentById(id);
      res.json({ success: true, payment: data });
    } catch (err) {
      next(err);
    }
  }

  async getMemberPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await paymentService.getMemberPayments(Number(id));
      res.json({ success: true, payments: data });
    } catch (err) {
      next(err);
    }
  }

  async getReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const download = req.query.download === "true";
      const format = req.query.format;

      if (format === "json") {
        const data = await paymentService.getReceiptData(Number(id));
        return res.json({ success: true, receipt: data });
      }

      const { pdfResult, invoiceNo } = await paymentService.ensureAndGetInvoicePDF(Number(id));

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `${download ? "attachment" : "inline"}; filename="${invoiceNo}.pdf"`
      );
      res.setHeader("Content-Length", pdfResult.pdfBuffer.length);
      return res.send(pdfResult.pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const download = req.query.download === "true";
      const format = req.query.format;

      if (format === "json") {
        const data = await paymentService.getInvoiceData(Number(id));
        return res.json({ success: true, invoice: data });
      }

      const { pdfResult, invoiceNo } = await paymentService.ensureAndGetInvoicePDF(Number(id));

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `${download ? "attachment" : "inline"}; filename="${invoiceNo}.pdf"`
      );
      res.setHeader("Content-Length", pdfResult.pdfBuffer.length);
      return res.send(pdfResult.pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async resendInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const channel = req.body?.channel || req.query?.channel || "all";
      const user = (req as any).user;

      const result = await paymentService.resendInvoice(
        Number(id),
        channel as "whatsapp" | "email" | "all",
        user?.username || user?.fullName || "Admin"
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
