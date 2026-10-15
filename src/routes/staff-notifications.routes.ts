import { Router, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getDbPool, isMockDatabase } from "../config/db";

// The staff bell: a feed built from real academy data (new registrations, payments, renewals
// due, events, closures and announcements). Read/cleared state is stored per staff account, so
// the red count is the same on every device the person uses.

const router = Router();
const STAFF = ["super_admin", "admin", "staff", "coach"];

type FeedItem = {
  id: string;
  type: "registration" | "approval" | "renewal" | "class" | "announcement";
  title: string;
  text: string;
  createdAt: string;
  read?: boolean;
};

const rupees = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const iso = (d: any) => (d ? new Date(d).toISOString() : new Date().toISOString());
const dateLabel = (d: any) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const timeLabel = (t: any) => String(t || "").slice(0, 5);

let stateTableReady = false;
async function ensureStateTable(pool: any) {
  if (stateTableReady) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS staff_notification_state (
    user_id VARCHAR(100) NOT NULL,
    notif_key VARCHAR(80) NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 1,
    dismissed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, notif_key)
  ) ENGINE=InnoDB`);
  stateTableReady = true;
}

// Each source is queried on its own so one missing table or column never empties the bell.
async function rows(pool: any, sql: string, params: any[] = []): Promise<any[]> {
  try {
    const [result]: any = await pool.query(sql, params);
    return Array.isArray(result) ? result : [];
  } catch (err: any) {
    console.warn("Staff notification source skipped:", err?.message || err);
    return [];
  }
}

async function buildFeed(pool: any, role: string): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  const seesOffice = role !== "coach"; // coaches only get class updates and announcements

  if (seesOffice) {
    for (const m of await rows(pool,
      `SELECT id, fullName, created_at FROM members
       WHERE registration_status = 'Pending' AND created_at >= NOW() - INTERVAL 30 DAY
       ORDER BY created_at DESC LIMIT 25`)) {
      items.push({
        id: `reg:${m.id}`, type: "registration", title: "New registration",
        text: `${m.fullName} registered and is waiting for approval.`, createdAt: iso(m.created_at)
      });
    }

    for (const p of await rows(pool,
      `SELECT p.id, p.amount, COALESCE(p.payment_date, p.created_at) AS paid_at, m.fullName
       FROM payments p LEFT JOIN members m ON m.id = p.member_id
       WHERE p.payment_status IN ('Paid', 'Successful')
         AND COALESCE(p.payment_date, p.created_at) >= NOW() - INTERVAL 7 DAY
       ORDER BY paid_at DESC LIMIT 25`)) {
      items.push({
        id: `pay:${p.id}`, type: "approval", title: "Payment received",
        text: `${rupees(p.amount)} from ${p.fullName || "a member"}.`, createdAt: iso(p.paid_at)
      });
    }

    const [due] = await rows(pool,
      `SELECT COUNT(*) AS n FROM members
       WHERE membership_end_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY`);
    if (due && Number(due.n) > 0) {
      const n = Number(due.n);
      const today = new Date().toISOString().slice(0, 10);
      items.push({
        id: `renew:${today}`, type: "renewal", title: "Renewals due",
        text: `${n} membership${n === 1 ? "" : "s"} end${n === 1 ? "s" : ""} in the next 7 days.`,
        createdAt: new Date(`${today}T03:30:00.000Z`).toISOString() // 9:00 am IST
      });
    }
  }

  for (const e of await rows(pool,
    `SELECT id, title, event_date, start_time, end_time, location, created_at FROM events
     WHERE created_at >= NOW() - INTERVAL 14 DAY OR event_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY
     ORDER BY event_date ASC LIMIT 15`)) {
    items.push({
      id: `event:${e.id}`, type: "class", title: e.title,
      text: `${dateLabel(e.event_date)}, ${timeLabel(e.start_time)}–${timeLabel(e.end_time)}${e.location ? ` at ${e.location}` : ""}.`,
      createdAt: iso(e.created_at)
    });
  }

  for (const h of await rows(pool,
    `SELECT id, name, holiday_date, created_at FROM holidays
     WHERE holiday_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 14 DAY
     ORDER BY holiday_date ASC LIMIT 10`)) {
    items.push({
      id: `holiday:${h.id}`, type: "class", title: "Pool closed",
      text: `${h.name} on ${dateLabel(h.holiday_date)}.`, createdAt: iso(h.created_at)
    });
  }

  for (const a of await rows(pool,
    `SELECT id, title, message, created_at FROM notifications
     WHERE member_id IS NULL AND created_at >= NOW() - INTERVAL 30 DAY
       AND type NOT IN ('WhatsApp Debug')
     ORDER BY created_at DESC LIMIT 15`)) {
    items.push({ id: `ann:${a.id}`, type: "announcement", title: a.title, text: a.message, createdAt: iso(a.created_at) });
  }

  return items.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

router.get("/staff/notifications", requireAuth(STAFF), async (req: any, res: Response, next) => {
  try {
    if (isMockDatabase()) return res.json({ notifications: [], unread: 0 });
    const pool = await getDbPool();
    await ensureStateTable(pool);
    const feed = await buildFeed(pool, req.user.role === "coach" ? "coach" : "office");
    const [state]: any = await pool.query(
      "SELECT notif_key, is_read, dismissed FROM staff_notification_state WHERE user_id = ?",
      [req.user.userId]
    );
    const byKey = new Map<string, any>((state || []).map((s: any) => [s.notif_key, s]));
    const notifications = feed
      .filter((n) => !Number(byKey.get(n.id)?.dismissed))
      .map((n) => ({ ...n, read: Boolean(Number(byKey.get(n.id)?.is_read)) }));
    res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
  } catch (err) {
    next(err);
  }
});

const KEY = /^[a-z]+:[\w-]+$/;

async function saveState(req: any, res: Response, next: any, dismissed: boolean) {
  try {
    const keys: string[] = Array.isArray(req.body?.keys) ? req.body.keys.filter((k: any) => typeof k === "string" && KEY.test(k)).slice(0, 200) : [];
    if (keys.length === 0) return res.json({ success: true });
    if (isMockDatabase()) return res.json({ success: true });
    const pool = await getDbPool();
    await ensureStateTable(pool);
    const values = keys.map((k) => [req.user.userId, k, 1, dismissed ? 1 : 0]);
    await pool.query(
      `INSERT INTO staff_notification_state (user_id, notif_key, is_read, dismissed) VALUES ?
       ON DUPLICATE KEY UPDATE is_read = 1${dismissed ? ", dismissed = 1" : ""}`,
      [values]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

router.post("/staff/notifications/read", requireAuth(STAFF), (req, res, next) => saveState(req, res, next, false));
router.post("/staff/notifications/dismiss", requireAuth(STAFF), (req, res, next) => saveState(req, res, next, true));

export default router;
