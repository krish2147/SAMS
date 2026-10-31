import { getDbPool } from "../config/db";
import { BatchOperationError, findBatchConflicts, type ValidatedBatchInput } from "../utils/batch-operations";

type PoolProvider = () => Promise<any>;

/** Batches of one academy with how many active members are in each, for Batch Management. */
export const OPERATIONAL_BATCH_LIST_SQL = `
  SELECT b.id, b.batch_name, b.start_time, b.end_time, b.capacity, b.status, COUNT(m.id) AS active_member_count
  FROM batches b
  LEFT JOIN members m ON m.selected_batch_id = b.id AND m.membership_status = 'Active'
  WHERE b.academy_id = ?
  GROUP BY b.id, b.batch_name, b.start_time, b.end_time, b.capacity, b.status`;

/** "18:30" -> "06:30 PM", the format batch times are stored and shown in elsewhere. */
function displayTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function operationalResult(row: any, activeMemberCount: number) {
  const capacity = Number(row.capacity || 0);
  return {
    id: Number(row.id),
    batchName: String(row.batch_name),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    capacity,
    status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
    activeMemberCount,
    availableSeats: Math.max(0, capacity - activeMemberCount)
  };
}

export class BatchRepository {
  constructor(private getPool: PoolProvider = getDbPool) {}

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
    const pool = await this.getPool();
    const [rows]: any = await pool.query("SELECT * FROM batches WHERE id = ? LIMIT 1", [id]);
    return rows && rows.length > 0 ? this.mapRowToBatch(rows[0]) : null;
  }

  async findByNameOrTime(queryStr: string): Promise<any | null> {
    const pool = await this.getPool();
    const name = String(queryStr || "").trim();
    if (!name) return null;
    // Exact batch name only. A partial match could put an applicant into the wrong batch, so an
    // unknown or ambiguous name finds no batch and registration asks them to choose again.
    const [rows]: any = await pool.query("SELECT * FROM batches WHERE batch_name = ? LIMIT 2", [name]);
    return rows?.length === 1 ? this.mapRowToBatch(rows[0]) : null;
  }

  async updateStrengthAndStatus(batchId: number | string): Promise<void> {
    const pool = await this.getPool();
    // Keeps the member count used by registration in sync. OPEN/CLOSED is set by the admin in
    // Batch Management, so the operational status unchanged here; registration separately refuses
    // a batch whose count has reached its capacity.
    const [rows]: any = await pool.query(
      "SELECT (SELECT COUNT(*) FROM members WHERE selected_batch_id = ? AND membership_status = 'Active') AS activeCount",
      [batchId]
    );
    const activeCount = Number(rows?.[0]?.activeCount || 0);
    await pool.query("UPDATE batches SET current_strength = ? WHERE id = ?", [activeCount, batchId]);
  }

  async getOperationalByAcademy(academyId: string): Promise<any[]> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query(OPERATIONAL_BATCH_LIST_SQL, [academyId]);
    return rows || [];
  }

  /** Runs fn in a transaction on one connection; rolls back and rethrows on any error. */
  private async inTransaction<T>(fn: (connection: any) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  private async lockOwnBatch(connection: any, id: number, academyId: string) {
    const [rows]: any = await connection.query(
      "SELECT id, academy_id, batch_name, start_time, end_time, capacity, status FROM batches WHERE id = ? FOR UPDATE",
      [id]
    );
    const batch = rows?.[0];
    if (!batch) throw new BatchOperationError("This batch no longer exists.", 404, "BATCH_NOT_FOUND");
    if ((batch.academy_id || "swim") !== academyId) throw new BatchOperationError("This batch belongs to another academy.", 403, "BATCH_ACADEMY_FORBIDDEN");
    return batch;
  }

  private async checkConflicts(connection: any, academyId: string, input: ValidatedBatchInput, excludedId?: number) {
    const [rows]: any = await connection.query("SELECT id, batch_name, start_time, end_time FROM batches WHERE academy_id = ?", [academyId]);
    const { duplicate, overlaps } = findBatchConflicts(rows || [], input, excludedId);
    if (duplicate) throw new BatchOperationError(`A batch called "${duplicate.batch_name}" already runs at this time.`, 409, "BATCH_DUPLICATE");
    if (overlaps.length > 0 && !input.confirmOverlap) {
      const names = overlaps.map((b) => b.batch_name).join(", ");
      throw new BatchOperationError(`This time overlaps with ${names}.`, 409, "BATCH_TIME_OVERLAP");
    }
  }

  async createOperational(academyId: string, input: ValidatedBatchInput) {
    return this.inTransaction(async (connection) => {
      await this.checkConflicts(connection, academyId, input);
      const [result]: any = await connection.query(
        "INSERT INTO batches (academy_id, batch_name, start_time, end_time, capacity, current_strength, status) VALUES (?, ?, ?, ?, ?, 0, ?)",
        [academyId, input.batchName, displayTime(input.startTime), displayTime(input.endTime), input.capacity, input.status]
      );
      return operationalResult({ id: result.insertId, batch_name: input.batchName, start_time: displayTime(input.startTime), end_time: displayTime(input.endTime), capacity: input.capacity, status: input.status }, 0);
    });
  }

  async updateOperational(id: number, academyId: string, input: ValidatedBatchInput) {
    return this.inTransaction(async (connection) => {
      await this.lockOwnBatch(connection, id, academyId);
      const [counts]: any = await connection.query(
        "SELECT COUNT(*) AS active_count FROM members WHERE selected_batch_id = ? AND membership_status = 'Active'",
        [id]
      );
      const active = Number(counts?.[0]?.active_count || 0);
      if (input.capacity < active) {
        throw new BatchOperationError(`Capacity cannot be lower than the ${active} active members in this batch.`, 409, "CAPACITY_BELOW_ACTIVE_MEMBERS");
      }
      await this.checkConflicts(connection, academyId, input, id);
      await connection.query(
        "UPDATE batches SET batch_name = ?, start_time = ?, end_time = ?, capacity = ?, status = ? WHERE id = ?",
        [input.batchName, displayTime(input.startTime), displayTime(input.endTime), input.capacity, input.status, id]
      );
      return operationalResult({ id, batch_name: input.batchName, start_time: displayTime(input.startTime), end_time: displayTime(input.endTime), capacity: input.capacity, status: input.status }, active);
    });
  }

  async deleteOperational(id: number, academyId: string) {
    return this.inTransaction(async (connection) => {
      await this.lockOwnBatch(connection, id, academyId);
      const [counts]: any = await connection.query("SELECT COUNT(*) AS assigned_count FROM members WHERE selected_batch_id = ?", [id]);
      const assigned = Number(counts?.[0]?.assigned_count || 0);
      if (assigned > 0) {
        throw new BatchOperationError(`${assigned} members are assigned to this batch. Move them to another batch before deleting it.`, 409, "BATCH_HAS_ASSIGNED_MEMBERS");
      }
      await connection.query("DELETE FROM batches WHERE id = ?", [id]);
      return true;
    });
  }

  async getAll(): Promise<any[]> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query("SELECT * FROM batches");
    return rows.map((r: any) => this.mapRowToBatch(r));
  }

  async create(batch: any): Promise<any> {
    const pool = await this.getPool();
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
    const pool = await this.getPool();
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
    const pool = await this.getPool();
    const [result]: any = await pool.query("DELETE FROM batches WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}
