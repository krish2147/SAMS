import { getDbPool, isMockDatabase } from "../config/db";
import { sendPaymentReminder } from "./whatsapp.service";

interface PaymentWhatsAppJob {
  phoneNumber: string;
  customerName: string;
  amount: string | number;
  paymentLink: string;
}

export async function enqueuePaymentWhatsApp(paymentId: number, payload: PaymentWhatsAppJob): Promise<void> {
  const pool = await getDbPool();
  if (isMockDatabase()) return;
  await pool.query(
    `INSERT INTO outbound_jobs (job_type, dedupe_key, payload, status, next_attempt_at)
     VALUES ('payment_whatsapp', ?, ?, 'Pending', CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       payload = VALUES(payload),
       status = IF(status = 'Completed', status, 'Pending'),
       next_attempt_at = IF(status = 'Completed', next_attempt_at, CURRENT_TIMESTAMP)`,
    [`payment-whatsapp-${paymentId}`, JSON.stringify(payload)]
  );
}

async function processNextJob(): Promise<boolean> {
  const pool = await getDbPool();
  if (isMockDatabase()) return false;

  await pool.query(
    `UPDATE outbound_jobs SET status = 'Pending'
     WHERE status = 'Processing' AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)`
  );

  const conn = await pool.getConnection();
  let job: any = null;
  try {
    await conn.beginTransaction();
    const [rows]: any = await conn.query(
      `SELECT * FROM outbound_jobs
       WHERE status IN ('Pending', 'Failed')
         AND attempts < max_attempts
         AND next_attempt_at <= CURRENT_TIMESTAMP
       ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    job = rows[0];
    if (!job) {
      await conn.commit();
      return false;
    }
    await conn.query(
      "UPDATE outbound_jobs SET status = 'Processing', attempts = attempts + 1 WHERE id = ?",
      [job.id]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  try {
    const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
    if (job.job_type !== "payment_whatsapp") throw new Error(`Unsupported outbound job type: ${job.job_type}`);
    await sendPaymentReminder(payload.phoneNumber, payload.customerName, payload.amount, payload.paymentLink);
    await pool.query(
      "UPDATE outbound_jobs SET status = 'Completed', completed_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?",
      [job.id]
    );
  } catch (err: any) {
    const attempts = Number(job.attempts || 0) + 1;
    const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
    const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000);
    await pool.query(
      `UPDATE outbound_jobs
       SET status = ?, next_attempt_at = ?, last_error = ?
       WHERE id = ?`,
      [attempts >= Number(job.max_attempts || 5) ? "Failed" : "Pending", nextAttemptAt, String(err?.message || err).slice(0, 2000), job.id]
    );
  }
  return true;
}

export function startNotificationWorker(): void {
  if (process.env.NODE_ENV === "test") return;
  const run = async () => {
    try {
      for (let count = 0; count < 10 && await processNextJob(); count += 1) {
        // Drain a small batch without monopolizing the process.
      }
    } catch (err) {
      console.error("Outbound notification worker error:", err);
    }
  };
  void run();
  const timer = setInterval(run, Number(process.env.NOTIFICATION_POLL_INTERVAL_MS || "15000"));
  timer.unref();
}
