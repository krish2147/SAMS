import { getDbPool } from "../config/db";

export class UserRepository {
  async getByEmail(email: string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email.trim()]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getById(id: number | string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async create(user: {
    name: string;
    email: string;
    passwordHash: string;
    phoneNumber: string;
    role: string;
    academyId?: string;
  }): Promise<number> {
    const pool = await getDbPool();
    const [result]: any = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone_number, role, academy_id) VALUES (?, ?, ?, ?, ?, ?)",
      [
        user.name.trim(),
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.phoneNumber,
        user.role,
        user.academyId || "swim"
      ]
    );
    return result.insertId;
  }

  async getAll(): Promise<any[]> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      "SELECT id, name, email, phone_number, role, academy_id as academyId, created_at FROM users"
    );
    return rows;
  }

  async delete(id: number | string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }

  async updateStatus(id: number | string, is_active: boolean): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    return result.affectedRows > 0;
  }

  async updateRole(id: number | string, role: string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    return result.affectedRows > 0;
  }

  async updatePassword(id: number | string, passwordHash: string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
    return result.affectedRows > 0;
  }

  async updateProfile(id: number | string, data: { name: string; email: string; phoneNumber: string; photoUrl?: string }): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query(
      "UPDATE users SET name = ?, email = ?, phone_number = ?, photo_url = ? WHERE id = ?",
      [data.name.trim(), data.email.toLowerCase().trim(), data.phoneNumber, data.photoUrl || null, id]
    );
    return result.affectedRows > 0;
  }
}
