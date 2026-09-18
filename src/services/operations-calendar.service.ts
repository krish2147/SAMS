import { getDbPool } from "../config/db";

export type CalendarTarget = "All Members" | "Selected Batches" | "Selected Categories";

function parseIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return String(value).split(",").map(item => item.trim()).filter(Boolean);
  }
}

function serializeIds(value: unknown): string | null {
  const ids = parseIds(value);
  return ids.length ? JSON.stringify(ids) : null;
}

function validateTargeting(target: CalendarTarget, batchIds: unknown, categories: unknown) {
  if (target === "Selected Batches" && parseIds(batchIds).length === 0) throw Object.assign(new Error("Select at least one batch."), { status: 400 });
  if (target === "Selected Categories" && parseIds(categories).length === 0) throw Object.assign(new Error("Select at least one membership category."), { status: 400 });
}

export function isCalendarItemRelevant(item: any, member: any): boolean {
  const target = item.applicable_to || "All Members";
  if (target === "All Members") return true;
  if (target === "Selected Batches") {
    return parseIds(item.applicable_batch_ids).includes(String(member.selected_batch_id || ""));
  }
  if (target === "Selected Categories") {
    return parseIds(item.applicable_plan_categories).includes(String(member.plan_category || member.planCategory || ""));
  }
  return false;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = String(value || "").trim();
  if (!text) throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  if (text.length > maxLength) throw Object.assign(new Error(`${field} is too long.`), { status: 400 });
  return text;
}

function validDate(value: unknown, field: string): string {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw Object.assign(new Error(`${field} must be a valid YYYY-MM-DD date.`), { status: 400 });
  }
  return date;
}

export class OperationsCalendarService {
  constructor(private readonly poolFactory: typeof getDbPool = getDbPool) {}

  async listAdmin(limit = 100) {
    const pool = await this.poolFactory();
    const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const [events]: any = await pool.query(
      `SELECT * FROM events ORDER BY event_date DESC, id DESC LIMIT ${boundedLimit}`
    );
    const [holidays]: any = await pool.query(
      `SELECT * FROM holidays ORDER BY holiday_date DESC, id DESC LIMIT ${boundedLimit}`
    );
    return { events: events || [], holidays: holidays || [], limit: boundedLimit };
  }

  async listUpcomingForMember(member: any, kind: "events" | "holidays", limit = 5) {
    const pool = await this.poolFactory();
    const boundedLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
    const candidateLimit = Math.max(30, boundedLimit * 6);
    if (kind === "events") {
      const [rows]: any = await pool.query(
        `SELECT * FROM events
         WHERE event_date >= CURDATE() AND status = 'Published'
         ORDER BY event_date ASC, start_time ASC LIMIT ${candidateLimit}`
      );
      return (rows || []).filter((row: any) => isCalendarItemRelevant(row, member)).slice(0, boundedLimit);
    }
    const [rows]: any = await pool.query(
      `SELECT * FROM holidays
       WHERE COALESCE(end_date, holiday_date) >= CURDATE() AND status = 'Active'
       ORDER BY holiday_date ASC LIMIT ${candidateLimit}`
    );
    return (rows || []).filter((row: any) => isCalendarItemRelevant(row, member)).slice(0, boundedLimit);
  }

  async createEvent(input: any, actor: string) {
    const title = requiredText(input.title, "Event title", 150);
    const eventDate = validDate(input.event_date || input.date, "Event date");
    const status = ["Draft", "Published", "Cancelled"].includes(input.status) ? input.status : "Published";
    const applicableTo: CalendarTarget = ["Selected Batches", "Selected Categories"].includes(input.applicable_to)
      ? input.applicable_to : "All Members";
    validateTargeting(applicableTo, input.applicable_batch_ids, input.applicable_plan_categories);
    const pool = await this.poolFactory();
    const [result]: any = await pool.query(
      `INSERT INTO events
       (title, description, event_date, start_time, end_time, location, event_type, image_url,
        registration_required, applicable_to, applicable_batch_ids, applicable_plan_categories, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, input.description || null, eventDate, input.start_time || "00:00:00", input.end_time || "23:59:59",
       input.location || "Main Pool Deck", input.event_type || "Event", input.image_url || null,
       input.registration_required ? 1 : 0, applicableTo, serializeIds(input.applicable_batch_ids),
       serializeIds(input.applicable_plan_categories), status, actor]
    );
    return this.getEvent(result.insertId);
  }

  async updateEvent(id: number, input: any) {
    const existing = await this.getEvent(id);
    if (!existing) throw Object.assign(new Error("Event not found."), { status: 404 });
    const merged = { ...existing, ...input };
    const title = requiredText(merged.title, "Event title", 150);
    const eventDate = validDate(merged.event_date || merged.date, "Event date");
    const status = ["Draft", "Published", "Cancelled"].includes(merged.status) ? merged.status : existing.status;
    validateTargeting(merged.applicable_to || "All Members", merged.applicable_batch_ids, merged.applicable_plan_categories);
    const pool = await this.poolFactory();
    await pool.query(
      `UPDATE events SET title=?, description=?, event_date=?, start_time=?, end_time=?, location=?, event_type=?,
       image_url=?, registration_required=?, applicable_to=?, applicable_batch_ids=?, applicable_plan_categories=?, status=? WHERE id=?`,
      [title, merged.description || null, eventDate, merged.start_time || "00:00:00", merged.end_time || "23:59:59",
       merged.location || "Main Pool Deck", merged.event_type || "Event", merged.image_url || null,
       merged.registration_required ? 1 : 0, merged.applicable_to || "All Members",
       serializeIds(merged.applicable_batch_ids), serializeIds(merged.applicable_plan_categories), status, id]
    );
    return this.getEvent(id);
  }

  async createHoliday(input: any, actor: string) {
    const name = requiredText(input.name || input.title, "Holiday name", 100);
    const holidayDate = validDate(input.holiday_date || input.date, "Holiday date");
    const endDate = input.end_date ? validDate(input.end_date, "End date") : null;
    if (endDate && endDate < holidayDate) throw Object.assign(new Error("End date cannot be before the holiday date."), { status: 400 });
    const status = input.status === "Cancelled" ? "Cancelled" : "Active";
    const applicableTo: CalendarTarget = ["Selected Batches", "Selected Categories"].includes(input.applicable_to)
      ? input.applicable_to : "All Members";
    validateTargeting(applicableTo, input.applicable_batch_ids, input.applicable_plan_categories);
    const pool = await this.poolFactory();
    const [result]: any = await pool.query(
      `INSERT INTO holidays
       (name, holiday_date, end_date, description, applicable_to, applicable_batch_ids,
        applicable_plan_categories, status, announcement_message, facility_closed, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, holidayDate, endDate, input.description || null, applicableTo, serializeIds(input.applicable_batch_ids),
       serializeIds(input.applicable_plan_categories), status, input.announcement_message || null,
       input.facility_closed === false ? 0 : 1, actor]
    );
    return this.getHoliday(result.insertId);
  }

  async updateHoliday(id: number, input: any) {
    const existing = await this.getHoliday(id);
    if (!existing) throw Object.assign(new Error("Holiday not found."), { status: 404 });
    const merged = { ...existing, ...input };
    const name = requiredText(merged.name || merged.title, "Holiday name", 100);
    const holidayDate = validDate(merged.holiday_date || merged.date, "Holiday date");
    const endDate = merged.end_date ? validDate(merged.end_date, "End date") : null;
    if (endDate && endDate < holidayDate) throw Object.assign(new Error("End date cannot be before the holiday date."), { status: 400 });
    const status = merged.status === "Cancelled" ? "Cancelled" : "Active";
    validateTargeting(merged.applicable_to || "All Members", merged.applicable_batch_ids, merged.applicable_plan_categories);
    const pool = await this.poolFactory();
    await pool.query(
      `UPDATE holidays SET name=?, holiday_date=?, end_date=?, description=?, applicable_to=?, applicable_batch_ids=?,
       applicable_plan_categories=?, status=?, announcement_message=?, facility_closed=? WHERE id=?`,
      [name, holidayDate, endDate, merged.description || null, merged.applicable_to || "All Members",
       serializeIds(merged.applicable_batch_ids), serializeIds(merged.applicable_plan_categories), status,
       merged.announcement_message || null, merged.facility_closed === false || merged.facility_closed === 0 ? 0 : 1, id]
    );
    return this.getHoliday(id);
  }

  async deleteItem(kind: "events" | "holidays", id: number) {
    const item = kind === "events" ? await this.getEvent(id) : await this.getHoliday(id);
    if (!item) throw Object.assign(new Error("Calendar item not found."), { status: 404 });
    const deletable = kind === "events" ? ["Draft", "Cancelled"].includes(item.status) : item.status === "Cancelled";
    if (!deletable) throw Object.assign(new Error("Cancel or unpublish this item before deleting it."), { status: 409 });
    const pool = await this.poolFactory();
    await pool.query(`DELETE FROM ${kind} WHERE id = ?`, [id]);
  }

  private async getEvent(id: number) {
    const pool = await this.poolFactory();
    const [rows]: any = await pool.query("SELECT * FROM events WHERE id = ? LIMIT 1", [id]);
    return rows?.[0] || null;
  }

  private async getHoliday(id: number) {
    const pool = await this.poolFactory();
    const [rows]: any = await pool.query("SELECT * FROM holidays WHERE id = ? LIMIT 1", [id]);
    return rows?.[0] || null;
  }
}
