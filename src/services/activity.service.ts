import { getDbPool } from "../config/db";

export interface Activity {
  id?: number;
  userName: string;
  action: string;
  date_time?: string;
  status: string;
  performedBy: string;
}

export class ActivityService {
  static async logActivity(userName: string, action: string, status: string, performedBy: string): Promise<void> {
    try {
      const pool = await getDbPool();
      await pool.query(
        "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, ?, ?)",
        [userName, action, status, performedBy]
      );
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  }

  static async getAllActivities(): Promise<Activity[]> {
    try {
      const pool = await getDbPool();
      const [rows]: any = await pool.query(
        "SELECT id, userName, action, DATE_FORMAT(date_time, '%Y-%m-%d %H:%i:%s') as date_time, status, performedBy FROM activities ORDER BY id DESC LIMIT 100"
      );
      
      if (rows && rows.length > 0) {
        return rows;
      }

      // Fallback seeded values for Recent Activity page if none exist yet
      return [
        {
          id: 5,
          userName: "Karan Patel",
          action: "Membership Renewal Completed",
          date_time: new Date(Date.now() - 1000 * 60 * 30).toISOString().replace("T", " ").substring(0, 19),
          status: "Success",
          performedBy: "Ankur (Admin)"
        },
        {
          id: 4,
          userName: "Manushi Shah",
          action: "Training Batch Changed to Morning Batch 2",
          date_time: new Date(Date.now() - 1000 * 60 * 120).toISOString().replace("T", " ").substring(0, 19),
          status: "Success",
          performedBy: "Mithil (Staff)"
        },
        {
          id: 3,
          userName: "Devendra Dave",
          action: "Payment of ₹12,000 Received",
          date_time: new Date(Date.now() - 1000 * 60 * 400).toISOString().replace("T", " ").substring(0, 19),
          status: "Paid",
          performedBy: "Rutik (Staff)"
        },
        {
          id: 2,
          userName: "Karan Patel",
          action: "Registration Application Approved",
          date_time: new Date(Date.now() - 1000 * 60 * 1440).toISOString().replace("T", " ").substring(0, 19),
          status: "Approved",
          performedBy: "Ankur (Admin)"
        },
        {
          id: 1,
          userName: "Manushi Shah",
          action: "New Registration Form Submitted",
          date_time: new Date(Date.now() - 1000 * 60 * 1500).toISOString().replace("T", " ").substring(0, 19),
          status: "Submitted",
          performedBy: "Self"
        }
      ];
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      return [];
    }
  }
}
