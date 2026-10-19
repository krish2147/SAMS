import { getDbPool, isMockDatabase } from "../config/db";
import { sendEventNotification } from "./communication.service";
import { sendRenewalReminderWhatsApp } from "./whatsapp.service";
import { calendarDaysBetween, formatDateOnlyForWhatsApp, toDateOnlyString } from "../utils/membership-date";

// Renewal reminders: each active member gets a WhatsApp/SMS/email message (the "renewal_reminder"
// template) and an in-app notification a week before their membership ends, and again on the last
// day. Each reminder is sent once per membership period: the member_renewal_reminders row is
// claimed before sending, so a restart or a second server never sends it twice. Messages go out
// only between 9 AM and 7 PM India time.

export const REMINDER_STAGES = [
  // A stage covers a window of days left, so a reminder missed while the server was down still goes
  // out the next day instead of being skipped.
  { key: "week", from: 2, to: 7 },
  { key: "last-day", from: 0, to: 1 },
] as const;

const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 19;

export function indiaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function indiaHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(now));
}

/** Which reminder (if any) is due for a membership ending on expiryDate. */
export function dueReminderStage(expiryDate: string, today: string) {
  const daysLeft = calendarDaysBetween(today, expiryDate);
  const stage = REMINDER_STAGES.find((s) => daysLeft >= s.from && daysLeft <= s.to);
  return stage ? { stage: stage.key, daysLeft } : null;
}

/** "in 7 days" / "tomorrow" / "today", for "your membership ends …". */
export function daysLeftText(daysLeft: number) {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

let tableReady = false;
async function ensureTable(pool: any) {
  if (tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS member_renewal_reminders (
       member_id INT UNSIGNED NOT NULL,
       expiry_date DATE NOT NULL,
       stage VARCHAR(20) NOT NULL,
       sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (member_id, expiry_date, stage)
     ) ENGINE=InnoDB`
  );
  tableReady = true;
}

export async function sendDueRenewalReminders(now = new Date()): Promise<number> {
  if (isMockDatabase()) return 0;
  const hour = indiaHour(now);
  if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return 0;

  const pool = await getDbPool();
  await ensureTable(pool);
  const today = indiaToday(now);
  const [rows]: any = await pool.query(
    `SELECT m.id, m.fullName, m.membershipNo, m.mobileNo, m.email, m.membership_end_date, b.batch_name
     FROM members m
     LEFT JOIN batches b ON m.selected_batch_id = b.id
     WHERE m.membership_status = 'Active'
       AND m.membership_end_date BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)`,
    [today, today]
  );

  const appUrl = (process.env.APP_BASE_URL || process.env.APP_URL || "").replace(/\/+$/, "");
  let sent = 0;
  for (const member of rows || []) {
    const expiry = toDateOnlyString(member.membership_end_date);
    if (!expiry) continue;
    const due = dueReminderStage(expiry, today);
    if (!due) continue;

    // Claim first: only the process whose insert lands sends the reminder.
    const [claim]: any = await pool.query(
      "INSERT IGNORE INTO member_renewal_reminders (member_id, expiry_date, stage) VALUES (?, ?, ?)",
      [member.id, expiry, due.stage]
    );
    if (!claim?.affectedRows) continue;

    const ends = formatDateOnlyForWhatsApp(expiry);
    const when = daysLeftText(due.daysLeft);
    try {
      await pool.query(
        "INSERT INTO notifications (member_id, title, message, type) VALUES (?, ?, ?, 'Renewal Reminder')",
        [member.id, `Your membership ends ${when}`, `Your membership ends on ${ends}. Tap Renew now on Home to pay online, or renew at the reception.`]
      );
      // WhatsApp goes through the approved "renewal_reminder" template (one variable per detail);
      // SMS and email use the communication template. A WhatsApp failure doesn't stop the others.
      if (member.mobileNo) {
        await sendRenewalReminderWhatsApp({
          phoneNumber: member.mobileNo,
          memberName: member.fullName,
          membershipNo: member.membershipNo,
          endsText: when,
          endDate: ends,
          batch: member.batch_name || "your batch"
        }).catch((err) => console.error(`[RenewalReminder] WhatsApp to member ${member.id} failed:`, err?.message || err));
      }
      await sendEventNotification(
        "renewal_reminder",
        { id: member.id, memberName: member.fullName, mobileNo: member.mobileNo, email: member.email || undefined },
        {
          membershipNo: member.membershipNo,
          expiryDate: ends,
          batch: member.batch_name || "your batch",
          daysLeft: due.daysLeft,
          daysLeftText: when,
          paymentLink: appUrl || undefined
        },
        "Renewal reminder",
        { channels: ["sms", "email"] }
      );
      sent += 1;
    } catch (err) {
      console.error(`[RenewalReminder] Could not remind member ${member.id}:`, err);
      // Release the claim so the next run tries again.
      await pool.query(
        "DELETE FROM member_renewal_reminders WHERE member_id = ? AND expiry_date = ? AND stage = ?",
        [member.id, expiry, due.stage]
      ).catch(() => undefined);
    }
  }
  return sent;
}

export function startRenewalReminderWorker(): void {
  if (process.env.NODE_ENV === "test") return;
  const run = async () => {
    try {
      const sent = await sendDueRenewalReminders();
      if (sent) console.log(`[RenewalReminder] Sent ${sent} renewal reminder(s).`);
    } catch (err) {
      console.error("[RenewalReminder] Worker error:", err);
    }
  };
  // First check a minute after start-up, then every 30 minutes.
  setTimeout(() => void run(), 60_000).unref();
  const timer = setInterval(run, Number(process.env.RENEWAL_REMINDER_INTERVAL_MS || 30 * 60_000));
  timer.unref();
}
