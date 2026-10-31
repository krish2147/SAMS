import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { currentGuestRate, guestInvoicePdf, listGuestVisits, recordGuestVisit } from "../services/guest.service";

// Guest (walk-in, pay-by-the-hour) swims recorded at the front desk.
const router = Router();
const DESK = ["admin", "super_admin", "staff", "receptionist"];
const academyOf = (req: any) => String(req.user?.academyId || "swim");
const fail = (res: any, err: any) => res.status(err?.status || 500).json({ success: false, error: err?.status ? err.message : "Something went wrong. Please try again." });

router.get("/guests/rate", requireAuth(DESK), async (_req, res) => {
  try { res.json({ success: true, ...(await currentGuestRate()) }); } catch (err) { fail(res, err); }
});

router.get("/guests", requireAuth(DESK), async (req: any, res) => {
  try { res.json({ success: true, visits: await listGuestVisits(academyOf(req), String(req.query.date || "")) }); } catch (err) { fail(res, err); }
});

router.post("/guests", requireAuth(DESK), async (req: any, res) => {
  try {
    const visit = await recordGuestVisit(req.body || {}, academyOf(req), String(req.user?.name || "Reception"));
    res.status(201).json({ success: true, visit });
  } catch (err) { fail(res, err); }
});

router.get("/guests/:id/invoice", requireAuth(DESK), async (req, res) => {
  try {
    const { invoiceNo, pdfBuffer } = await guestInvoicePdf(Number(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${req.query.download === "true" ? "attachment" : "inline"}; filename="${invoiceNo}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { fail(res, err); }
});

export default router;
