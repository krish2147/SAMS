import { getDbPool } from "../config/db";

export class BookingRepository {
  async getAll(academyId?: string): Promise<any[]> {
    const pool = await getDbPool();
    if (academyId) {
      const [rows]: any = await pool.query(
        "SELECT * FROM bookings WHERE academyId = ? ORDER BY id DESC",
        [academyId]
      );
      return rows;
    } else {
      const [rows]: any = await pool.query("SELECT * FROM bookings ORDER BY id DESC");
      return rows;
    }
  }

  async create(booking: {
    id: string;
    studentName: string;
    academyId: string;
    date: string;
    timeSlot: string;
    facility: string;
    status?: string;
  }): Promise<any> {
    const pool = await getDbPool();
    const status = booking.status || "Confirmed";
    await pool.query(
      "INSERT INTO bookings (id, studentName, academyId, date, timeSlot, facility, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        booking.id,
        booking.studentName,
        booking.academyId,
        booking.date,
        booking.timeSlot,
        booking.facility,
        status
      ]
    );
    return { ...booking, status };
  }
}
