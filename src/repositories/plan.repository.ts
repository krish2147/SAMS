import { getDbPool } from "../config/db";

export class PlanRepository {
  async getById(id: number | string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query("SELECT * FROM membership_plans WHERE id = ? LIMIT 1", [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findByName(name: string): Promise<any | null> {
    const pool = await getDbPool();
    const cleanName = name.trim();
    
    // Attempt exact match
    let [rows]: any = await pool.query(
      "SELECT * FROM membership_plans WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [cleanName]
    );
    if (rows && rows.length > 0) return rows[0];

    // Attempt fuzzy match
    [rows] = await pool.query(
      "SELECT * FROM membership_plans WHERE LOWER(name) LIKE ? LIMIT 1",
      [`%${cleanName.toLowerCase()}%`]
    );
    if (rows && rows.length > 0) return rows[0];

    // Default to first plan if none matches
    [rows] = await pool.query("SELECT * FROM membership_plans LIMIT 1");
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getAll(): Promise<any[]> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query("SELECT * FROM membership_plans");
    return rows;
  }

  async create(plan: any): Promise<any> {
    const pool = await getDbPool();
    const [result]: any = await pool.query(
      "INSERT INTO membership_plans (name, duration_months, registration_fee, renewal_fee, co_charge, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        plan.name.trim(),
        Number(plan.duration_months),
        Number(plan.registration_fee || 0),
        Number(plan.renewal_fee || 0),
        Number(plan.co_charge || 0),
        plan.description || null,
        plan.is_active !== undefined ? (plan.is_active ? 1 : 0) : 1
      ]
    );
    const insertId = result.insertId;
    return this.getById(insertId);
  }

  async update(id: number | string, plan: any): Promise<any> {
    const pool = await getDbPool();
    await pool.query(
      "UPDATE membership_plans SET name = ?, duration_months = ?, registration_fee = ?, renewal_fee = ?, co_charge = ?, description = ?, is_active = ? WHERE id = ?",
      [
        plan.name.trim(),
        Number(plan.duration_months),
        Number(plan.registration_fee || 0),
        Number(plan.renewal_fee || 0),
        Number(plan.co_charge || 0),
        plan.description || null,
        plan.is_active ? 1 : 0,
        id
      ]
    );
    return this.getById(id);
  }

  async delete(id: number | string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("DELETE FROM membership_plans WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}
