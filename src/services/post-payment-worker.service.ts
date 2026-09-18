import { getDbPool } from "../config/db";
import { PaymentService } from "./payment.service";

export function startPostPaymentWorker(): void {
  if (process.env.NODE_ENV === "test") return;
  const service = new PaymentService();
  const run = async () => {
    try {
      const pool = await getDbPool();
      const [rows]: any = await pool.query(
        `SELECT id FROM payments WHERE payment_status = 'Paid' AND (
          invoice_generation_status = 'Pending' OR payment_success_whatsapp_status = 'Pending' OR invoice_whatsapp_status = 'Pending' OR
          (invoice_generation_status = 'Processing' AND invoice_generation_processing_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)) OR
          (payment_success_whatsapp_status = 'Processing' AND payment_success_whatsapp_processing_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)) OR
          (invoice_whatsapp_status = 'Processing' AND invoice_whatsapp_processing_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE))
        ) ORDER BY id ASC LIMIT 10`
      );
      for (const row of rows || []) await service.processPostPaymentPipeline(Number(row.id));
    } catch (error: any) {
      console.error(`[POST_PAYMENT] Worker failed: ${error?.message || error}`);
    }
  };
  void run();
  const timer = setInterval(run, Number(process.env.POST_PAYMENT_POLL_INTERVAL_MS || "15000"));
  timer.unref();
}
