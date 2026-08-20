import { getDbPool } from "../config/db";

export class BatchRepository {
  private mapRowToBatch(row: any) {
    if (!row) return null;
    const capacity = Number(row.capacity || 0);
    const current_strength = Number(row.current_strength || 0);
    return {
      id: row.id,
      academy_id: row.academy_id,
      batch_name: row.batch_name,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity,
      current_strength,
      status: row.status,
      remaining_seats: Math.max(0, capacity - current_strength),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async getById(id: number | string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query("SELECT * FROM batches WHERE id = ? LIMIT 1", [id]);
    return rows && rows.length > 0 ? this.mapRowToBatch(rows[0]) : null;
  }

  async findByNameOrTime(queryStr: string): Promise<any | null> {
    const pool = await getDbPool();
    // Trim query to handle matches
    const cleanQuery = queryStr.trim();
    
    // Attempt exact match on batch_name
    let [rows]: any = await pool.query("SELECT * FROM batches WHERE batch_name = ? LIMIT 1", [cleanQuery]);
    if (rows && rows.length > 0) return this.mapRowToBatch(rows[0]);

    // Attempt fuzzy match on batch_name or timing
    [rows] = await pool.query(
      "SELECT * FROM batches WHERE batch_name LIKE ? OR start_time LIKE ? OR ? LIKE CONCAT('%', start_time, '%') LIMIT 1",
      [`%${cleanQuery}%`, `%${cleanQuery}%`, cleanQuery]
    );
    if (rows && rows.length > 0) return this.mapRowToBatch(rows[0]);

    // Fallback to first batch
    [rows] = await pool.query("SELECT * FROM batches LIMIT 1");
    return rows && rows.length > 0 ? this.mapRowToBatch(rows[0]) : null;
  }

  async updateStrengthAndStatus(batchId: number | string): Promise<void> {
    const pool = await getDbPool();
    
    // Get capacity and current count of active members in this batch
    const [rows]: any = await pool.query(`
      SELECT capacity, 
             (SELECT COUNT(*) FROM members WHERE selected_batch_id = ? AND membership_status = 'Active') as activeCount
      FROM batches 
      WHERE id = ? 
      LIMIT 1
    `, [batchId, batchId]);

    if (rows && rows.length > 0) {
      const { capacity, activeCount } = rows[0];
      const status = activeCount >= capacity ? "CLOSED" : "OPEN";
      
      await pool.query(
        "UPDATE batches SET current_strength = ?, status = ? WHERE id = ?",
        [activeCount, status, batchId]
      );
      console.log(`⚡ Batch ${batchId} updated: current_strength = ${activeCount}, status = ${status}`);
    }
  }

  async getAll(): Promise<any[]> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query("SELECT * FROM batches");
    return rows.map((r: any) => this.mapRowToBatch(r));
  }

  async create(batch: any): Promise<any> {
    const pool = await getDbPool();
    const [result]: any = await pool.query(
      "INSERT INTO batches (academy_id, batch_name, start_time, end_time, capacity, current_strength, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        batch.academy_id || "swim",
        batch.batch_name.trim(),
        batch.start_time.trim(),
        batch.end_time.trim(),
        Number(batch.capacity),
        Number(batch.current_strength || 0),
        batch.status || "OPEN"
      ]
    );
    const insertId = result.insertId;
    return this.getById(insertId);
  }

  async update(id: number | string, batch: any): Promise<any> {
    const pool = await getDbPool();
    const current_strength = Number(batch.current_strength || 0);
    const capacity = Number(batch.capacity);
    // Automatically set status to CLOSED if capacity reached, or open if space
    const status = batch.status === "CLOSED" ? "CLOSED" : (current_strength >= capacity ? "CLOSED" : "OPEN");

    await pool.query(
      "UPDATE batches SET academy_id = ?, batch_name = ?, start_time = ?, end_time = ?, capacity = ?, current_strength = ?, status = ? WHERE id = ?",
      [
        batch.academy_id || "swim",
        batch.batch_name.trim(),
        batch.start_time.trim(),
        batch.end_time.trim(),
        capacity,
        current_strength,
        status,
        id
      ]
    );
    return this.getById(id);
  }

  async delete(id: number | string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("DELETE FROM batches WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}
