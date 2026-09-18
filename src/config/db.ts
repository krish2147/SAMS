import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

let dbPool: mysql.Pool | null = null;
let connectionError: Error | null = null;
let mockDatabaseActive = false;

export function isMockDatabase(): boolean {
  return mockDatabaseActive;
}

export async function getDbPool(): Promise<mysql.Pool> {
  if (dbPool) return dbPool!;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "bsfms_db";
  const port = parseInt(process.env.DB_PORT || "3306", 10);

  if (!host) {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_MOCK_DB === "false") {
      throw new Error("DB_HOST is required. The mock database is disabled for production deployments.");
    }
    console.log("ℹ️ DB_HOST not set. SAMS initialized its high-performance persistent database engine.");
    mockDatabaseActive = true;
    dbPool = createMockPool();
    return dbPool!;
  }

  try {
    const config: mysql.PoolOptions = {
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || "20", 10),
      queueLimit: 0,
      connectTimeout: Number.parseInt(process.env.DB_CONNECT_TIMEOUT_MS || "10000", 10),
      ssl: process.env.DB_CA_CERT
        ? { ca: process.env.DB_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true }
        : undefined,
      multipleStatements: true,
    };

    console.log(`🔌 Connecting to database at ${host}:${port}/${database}...`);
    const pool = mysql.createPool(config);

    // Verify connection
    const conn = await pool.getConnection();
    conn.release();

    dbPool = pool;
    mockDatabaseActive = false;
    connectionError = null;
    console.log("✅ MySQL Database connected successfully!");

    // Set up schema and seed
    await initDbSchema(pool);

    return dbPool!;
  } catch (err: any) {
    connectionError = err;
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_MOCK_DB === "false") {
      throw err;
    }
    console.log(`ℹ️ MySQL local daemon not active (${err.message}). Activated SAMS persistent database engine.`);
    mockDatabaseActive = true;
    dbPool = createMockPool();
    return dbPool!;
  }
}

export function getConnectionError(): Error | null {
  return connectionError;
}

async function initDbSchema(pool: mysql.Pool) {
  try {
    console.log("⚙️ Initializing MySQL Database Schema...");
    const schemaPath = path.join(process.cwd(), "src", "config", "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema SQL file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
   const cleanedSql = schemaSql.replace(/^--.*$/gm, "");

const statements = cleanedSql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }
    
    // Dynamically ensure description exists in membership_plans for compatibility
    try {
      await pool.query("ALTER TABLE membership_plans ADD COLUMN description TEXT NULL");
      console.log("⚡ Added 'description' column to 'membership_plans' table.");
    } catch (colErr) {
      // Column probably already exists, which is fine
    }

    // Dynamically ensure photo_url exists in users for compatibility
    try {
      await pool.query("ALTER TABLE users ADD COLUMN photo_url LONGTEXT NULL");
      console.log("⚡ Added 'photo_url' column to 'users' table.");
    } catch (colErr) {
      // Column probably already exists, which is fine
    }

    // Dynamically ensure new payments columns exist
    const alterColumns = [
      "ALTER TABLE payments ADD COLUMN payment_type VARCHAR(50) NOT NULL DEFAULT 'Registration'",
      "ALTER TABLE payments ADD COLUMN registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE payments ADD COLUMN renewal_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE payments ADD COLUMN razorpay_signature VARCHAR(255) NULL",
      "ALTER TABLE payments ADD COLUMN failure_reason TEXT NULL",
      "ALTER TABLE payments ADD COLUMN approved_by VARCHAR(100) NULL DEFAULT 'System Admin'",
      "ALTER TABLE payments ADD COLUMN receipt_no VARCHAR(100) NULL",
      "ALTER TABLE payments ADD COLUMN invoice_no VARCHAR(100) NULL",
      "ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE payments ADD COLUMN refund_status VARCHAR(50) NULL",
      "ALTER TABLE payments ADD COLUMN refund_date TIMESTAMP NULL DEFAULT NULL",
      "ALTER TABLE payments ADD COLUMN refund_txn_id VARCHAR(100) NULL",
      "ALTER TABLE payments ADD COLUMN gateway_response TEXT NULL",
      "ALTER TABLE payments ADD COLUMN payment_link_url VARCHAR(500) NULL",
      "ALTER TABLE payments ADD COLUMN registration_id INT UNSIGNED NULL",
      "ALTER TABLE payments ADD COLUMN invoice_path VARCHAR(255) NULL",
      "ALTER TABLE payments ADD COLUMN invoice_url VARCHAR(255) NULL",
      "ALTER TABLE payments ADD COLUMN generated_at TIMESTAMP NULL DEFAULT NULL",
      "ALTER TABLE members ADD COLUMN membership_start_date DATE NULL",
      "ALTER TABLE members ADD COLUMN membership_end_date DATE NULL",
      "ALTER TABLE members ADD COLUMN next_renewal_date DATE NULL",
      "ALTER TABLE members ADD COLUMN last_payment_id INT UNSIGNED NULL"
    ];

    for (const alterSql of alterColumns) {
      try {
        await pool.query(alterSql);
      } catch (_) {}
    }

    const indexMigrations = [
      "ALTER TABLE payments ADD UNIQUE INDEX uq_payments_razorpay_order (razorpay_order_id)",
      "ALTER TABLE payments ADD UNIQUE INDEX uq_payments_razorpay_payment (razorpay_payment_id)",
      "ALTER TABLE payments ADD INDEX idx_payments_member_status (member_id, payment_status)",
      "ALTER TABLE payments ADD INDEX idx_payments_created_at (created_at)",
      "ALTER TABLE members ADD INDEX idx_member_payment_status (payment_status)",
      "ALTER TABLE members ADD INDEX idx_member_created_at (created_at)"
    ];

    for (const migrationSql of indexMigrations) {
      try {
        await pool.query(migrationSql);
      } catch (err: any) {
        if (err?.code !== "ER_DUP_KEYNAME" && process.env.NODE_ENV === "production") throw err;
      }
    }

    console.log("✅ MySQL Database tables initialized/verified.");

    // Seed default data
    await seedDefaultData(pool);
  } catch (err: any) {
    console.error("❌ Schema setup/seed failed:", err);
    throw err;
  }
}

async function seedDefaultData(pool: mysql.Pool) {
  try {
    const [academyCount]: any = await pool.query("SELECT COUNT(*) as count FROM academies");
    if (academyCount[0].count === 0) {
      console.log("🌱 Seeding default academies...");
      await pool.query("INSERT INTO academies (id, name) VALUES ('swim', 'Baroda Swim Front')");
      await pool.query("INSERT INTO academies (id, name) VALUES ('cricket', 'Baroda Cricket Academy')");
    } else {
      await pool.query("UPDATE academies SET name = 'Baroda Swim Front' WHERE id = 'swim'");
    }

    const [planCount]: any = await pool.query("SELECT COUNT(*) as count FROM membership_plans");
    if (planCount[0].count === 0) {
      console.log("🌱 Seeding membership plans...");
      const plans = [
        [1, "Quarterly", 3, 500.00, 2000.00, 0.00, 1],
        [2, "Monthly", 1, 500.00, 1000.00, 0.00, 1],
        [3, "Yearly", 12, 500.00, 10000.00, 0.00, 1],
        [4, "General", 1, 500.00, 2000.00, 0.00, 1],
        [5, "Learners", 1, 500.00, 3500.00, 0.00, 1],
        [6, "Family", 1, 500.00, 6000.00, 1500.00, 1]
      ];
      for (const p of plans) {
        await pool.query(
          "INSERT INTO membership_plans (id, name, duration_months, registration_fee, renewal_fee, co_charge, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
          p
        );
      }
    }

    const [batchCount]: any = await pool.query("SELECT COUNT(*) as count FROM batches");
    if (batchCount[0].count === 0) {
      console.log("🌱 Seeding training batches...");
      const batches = [
        [1, "swim", "Morning Batch 1 (06:00 AM - 07:00 AM)", "06:00 AM", "07:00 AM", 30, 0, "OPEN"],
        [2, "swim", "Morning Batch 2 (07:00 AM - 08:00 AM)", "07:00 AM", "08:00 AM", 30, 0, "OPEN"],
        [3, "swim", "Morning Batch 3 (08:00 AM - 09:00 AM)", "08:00 AM", "09:00 AM", 30, 0, "OPEN"],
        [4, "swim", "Evening Batch 1 (04:00 PM - 05:00 PM)", "04:00 PM", "05:00 PM", 30, 0, "OPEN"],
        [5, "swim", "Evening Batch 2 (05:00 PM - 06:00 PM)", "05:00 PM", "06:00 PM", 30, 0, "OPEN"],
        [6, "swim", "Evening Batch 3 (06:00 PM - 07:00 PM)", "06:00 PM", "07:00 PM", 30, 0, "OPEN"],
        [7, "swim", "Evening Batch 4 (07:00 PM - 08:00 PM)", "07:00 PM", "08:00 PM", 30, 0, "OPEN"],
        [8, "swim", "Evening Batch 5 (08:00 PM - 09:00 PM)", "08:00 PM", "09:00 PM", 30, 0, "OPEN"],
        [9, "cricket", "Morning Sunrise Batch (A)", "08:00 AM", "09:00 AM", 30, 0, "OPEN"]
      ];
      for (const b of batches) {
        await pool.query(
          "INSERT INTO batches (id, academy_id, batch_name, start_time, end_time, capacity, current_strength, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          b
        );
      }
    }

    const [userCount]: any = await pool.query("SELECT COUNT(*) as count FROM users");
    if (userCount[0].count === 0) {
      const salt = await bcrypt.genSalt(10);
      if (process.env.NODE_ENV === "production") {
        const email = process.env.INITIAL_ADMIN_EMAIL;
        const password = process.env.INITIAL_ADMIN_PASSWORD;
        if (!email || !password || password.length < 12) {
          throw new Error("A new production database requires INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD of at least 12 characters.");
        }
        const hash = await bcrypt.hash(password, salt);
        await pool.query(
          "INSERT INTO users (name, email, password_hash, phone_number, role, academy_id) VALUES (?, ?, ?, ?, 'super_admin', 'swim')",
          [process.env.INITIAL_ADMIN_NAME || "System Administrator", email.toLowerCase().trim(), hash, process.env.INITIAL_ADMIN_PHONE || "+910000000000"]
        );
        console.log("🌱 Created the initial production administrator from environment configuration.");
      } else {
        const email = (process.env.DEV_ADMIN_EMAIL || "admin@example.test").toLowerCase().trim();
        const password = process.env.DEV_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
        const hash = await bcrypt.hash(password, salt);
        await pool.query(
          "INSERT INTO users (name, email, password_hash, phone_number, role, academy_id) VALUES (?, ?, ?, ?, 'super_admin', 'swim')",
          [process.env.DEV_ADMIN_NAME || "Development Administrator", email, hash, process.env.DEV_ADMIN_PHONE || "+910000000000"]
        );
        console.log("🌱 Created the local-only development administrator.");
        if (!process.env.DEV_ADMIN_PASSWORD) {
          console.log(`🔐 Temporary local credentials: ${email} / ${password}`);
        }
      }
    } else {
      console.log("✅ Existing staff credentials preserved.");
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    throw err;
  }
}

// ==========================================
// FILE-BASED MOCK DATABASE ENGINE FALLBACK
// ==========================================

function getMockDbPath() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return path.join(uploadsDir, "mock-database.json");
}

function loadMockDb(): any {
  const dbPath = getMockDbPath();
  let db: any = null;
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    } catch (e) {
      console.error("Failed to parse mock database, resetting...", e);
    }
  }

  if (!db) {
    const devAdminEmail = (process.env.DEV_ADMIN_EMAIL || "admin@example.test").toLowerCase().trim();
    const devAdminPassword = process.env.DEV_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
    const devAdminPasswordHash = bcrypt.hashSync(devAdminPassword, bcrypt.genSaltSync(10));
    const initialDb = {
      academies: [
        { id: 'swim', name: 'Baroda Swim Front', created_at: new Date().toISOString() },
        { id: 'cricket', name: 'Baroda Cricket Academy', created_at: new Date().toISOString() }
      ],
      membership_plans: [
        { id: 1, name: "Quarterly", duration_months: 3, registration_fee: 500.00, renewal_fee: 2000.00, co_charge: 0.00, is_active: 1 },
        { id: 2, name: "Monthly", duration_months: 1, registration_fee: 500.00, renewal_fee: 1000.00, co_charge: 0.00, is_active: 1 },
        { id: 3, name: "Yearly", duration_months: 12, registration_fee: 500.00, renewal_fee: 10000.00, co_charge: 0.00, is_active: 1 },
        { id: 4, name: "General", duration_months: 1, registration_fee: 500.00, renewal_fee: 2000.00, co_charge: 0.00, is_active: 1 },
        { id: 5, name: "Learners", duration_months: 1, registration_fee: 500.00, renewal_fee: 3500.00, co_charge: 0.00, is_active: 1 },
        { id: 6, name: "Family", duration_months: 1, registration_fee: 500.00, renewal_fee: 6000.00, co_charge: 1500.00, is_active: 1 }
      ],
      batches: [
        { id: 1, academy_id: "swim", batch_name: "Morning Batch 1 (06:00 AM - 07:00 AM)", start_time: "06:00 AM", end_time: "07:00 AM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 2, academy_id: "swim", batch_name: "Morning Batch 2 (07:00 AM - 08:00 AM)", start_time: "07:00 AM", end_time: "08:00 AM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 3, academy_id: "swim", batch_name: "Morning Batch 3 (08:00 AM - 09:00 AM)", start_time: "08:00 AM", end_time: "09:00 AM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 4, academy_id: "swim", batch_name: "Evening Batch 1 (04:00 PM - 05:00 PM)", start_time: "04:00 PM", end_time: "05:00 PM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 5, academy_id: "swim", batch_name: "Evening Batch 2 (05:00 PM - 06:00 PM)", start_time: "05:00 PM", end_time: "06:00 PM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 6, academy_id: "swim", batch_name: "Evening Batch 3 (06:00 PM - 07:00 PM)", start_time: "06:00 PM", end_time: "07:00 PM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 7, academy_id: "swim", batch_name: "Evening Batch 4 (07:00 PM - 08:00 PM)", start_time: "07:00 PM", end_time: "08:00 PM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 8, academy_id: "swim", batch_name: "Evening Batch 5 (08:00 PM - 09:00 PM)", start_time: "08:00 PM", end_time: "09:00 PM", capacity: 30, current_strength: 0, status: "OPEN" },
        { id: 9, academy_id: "cricket", batch_name: "Morning Sunrise Batch (A)", start_time: "08:00 AM", end_time: "09:00 AM", capacity: 30, current_strength: 0, status: "OPEN" }
      ],
      users: [
        {
          id: 1,
          name: process.env.DEV_ADMIN_NAME || "Development Administrator",
          email: devAdminEmail,
          password_hash: devAdminPasswordHash,
          role: "super_admin",
          phone_number: process.env.DEV_ADMIN_PHONE || "+910000000000",
          is_active: 1,
          academy_id: "swim"
        }
      ],
      members: [],
      bookings: [],
      payments: [],
      renewals: [],
      attendance: [],
      events: [],
      holidays: [],
      notifications: []
    };

    saveMockDb(initialDb);
    if (!process.env.DEV_ADMIN_PASSWORD) {
      console.log(`🔐 Temporary local credentials: ${devAdminEmail} / ${devAdminPassword}`);
    }
    return initialDb;
  }

  // Ensure arrays exist
  if (db) {
    if (!db.attendance) db.attendance = [];
    if (!db.events) db.events = [];
    if (!db.holidays) db.holidays = [];
    if (!db.notifications) db.notifications = [];
    if (!db.activities) db.activities = [];
  }

  return db;
}

function saveMockDb(data: any) {
  try {
    fs.writeFileSync(getMockDbPath(), JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save mock database file", e);
  }
}

function executeMockQuery(sql: string, params: any[] = []): [any, any] {
  const db = loadMockDb();
  const sqlTrim = sql.trim().replace(/\s+/g, ' ');

  // 0. Specific Payments & Dashboard Queries (for SAMS Auditing)
  if (sqlTrim.match(/FROM communication_templates/i)) {
    db.communication_templates = db.communication_templates || [];
    if (sqlTrim.match(/WHERE event_key = \?/i)) {
      const match = db.communication_templates.filter((t: any) => t.event_key === params[0]);
      return [match, null];
    }
    return [db.communication_templates, null];
  }

  if (sqlTrim.match(/UPDATE communication_templates SET/i)) {
    db.communication_templates = db.communication_templates || [];
    const eventKey = params[params.length - 1];
    const target = db.communication_templates.find((t: any) => t.event_key === eventKey);
    if (target) {
      if (params[0] !== null) target.title = params[0];
      if (params[1] !== null) target.whatsapp_template_name = params[1];
      if (params[2] !== null) target.whatsapp_content = params[2];
      if (params[3] !== null) target.sms_content = params[3];
      if (params[4] !== null) target.email_subject = params[4];
      if (params[5] !== null) target.email_body_html = params[5];
      if (params[6] !== null) target.channels = params[6];
      saveMockDb(db);
    }
    return [{ affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/INSERT INTO communication_logs/i) || sqlTrim.match(/INSERT IGNORE INTO communication_templates/i)) {
    if (sqlTrim.match(/communication_templates/i)) {
      db.communication_templates = db.communication_templates || [];
      const exists = db.communication_templates.some((t: any) => t.event_key === params[0]);
      if (!exists) {
        db.communication_templates.push({
          id: db.communication_templates.length + 1,
          event_key: params[0],
          title: params[1],
          whatsapp_template_name: params[2],
          whatsapp_content: params[3],
          sms_content: params[4],
          email_subject: params[5],
          email_body_html: params[6],
          channels: params[7]
        });
        saveMockDb(db);
      }
      return [{ insertId: db.communication_templates.length }, null];
    }

    db.communication_logs = db.communication_logs || [];
    const newId = db.communication_logs.length + 1;
    const logObj = {
      id: newId,
      member_id: params[0],
      member_name: params[1],
      mobile_no: params[2],
      email: params[3],
      event_key: params[4],
      message_title: params[5],
      channel_whatsapp: params[6],
      channel_sms: params[7],
      channel_email: params[8],
      whatsapp_response: params[9],
      sms_response: params[10],
      email_response: params[11],
      status: params[12],
      sent_by: params[13],
      recipient_group: params[14],
      content_preview: params[15],
      created_at: new Date().toISOString()
    };
    db.communication_logs.unshift(logObj);
    saveMockDb(db);
    return [{ insertId: newId }, null];
  }

  if (sqlTrim.match(/FROM communication_logs/i)) {
    db.communication_logs = db.communication_logs || [];
    let list = [...db.communication_logs];
    if (sqlTrim.match(/WHERE id = \?/i)) {
      const match = list.filter((l: any) => l.id === Number(params[0]));
      return [match, null];
    }
    return [list, null];
  }

  if (sqlTrim.match(/FROM payments p/i) && sqlTrim.match(/LEFT JOIN members m/i)) {
    const list = db.payments || [];
    let joined = list.map((p: any) => {
      const m = db.members.find((mem: any) => mem.id === p.member_id || mem.membershipNo === p.membershipNo) || { fullName: "Member", membershipNo: "BSF-2026-1001", mobileNo: "9876543210", email: "", addressLine1: "" };
      const pl = db.membership_plans?.find((plan: any) => plan.id === p.membership_plan_id) || { name: "Standard Membership Plan" };
      return {
        id: p.id,
        member_id: p.member_id,
        membership_plan_id: p.membership_plan_id || 1,
        payment_type: p.payment_type || "Registration",
        amount: Number(p.amount || 0),
        registration_fee: Number(p.registration_fee || 0),
        renewal_fee: Number(p.renewal_fee || 0),
        payment_status: p.payment_status || "Pending",
        payment_method: p.payment_method || "Razorpay",
        razorpay_order_id: p.razorpay_order_id || `order_${p.id}`,
        razorpay_payment_id: p.razorpay_payment_id || `pay_${p.id}`,
        razorpay_signature: p.razorpay_signature || "verified",
        failure_reason: p.failure_reason || null,
        approved_by: p.approved_by || "System Admin",
        receipt_no: p.receipt_no || `BSF-REC-2026-${String(p.id).padStart(4, '0')}`,
        invoice_no: p.invoice_no || `BSF-INV-2026-${String(p.id).padStart(4, '0')}`,
        refund_amount: Number(p.refund_amount || 0),
        refund_status: p.refund_status || null,
        refund_date: p.refund_date || null,
        refund_txn_id: p.refund_txn_id || null,
        gateway_response: p.gateway_response || null,
        payment_date: p.payment_date || p.created_at || new Date().toISOString(),
        created_at: p.created_at || new Date().toISOString(),
        member_name: m.fullName,
        membershipNo: m.membershipNo,
        mobileNo: m.mobileNo,
        email: m.email,
        addressLine1: m.addressLine1,
        plan_name: pl.name
      };
    }).sort((a: any, b: any) => b.id - a.id);
    if (sqlTrim.match(/WHERE p\.id = \?/i)) {
      joined = joined.filter((p: any) => Number(p.id) === Number(params[0]));
    } else if (sqlTrim.match(/WHERE p\.razorpay_order_id = \?/i)) {
      joined = joined.filter((p: any) => p.razorpay_order_id === params[0]);
    } else if (sqlTrim.match(/WHERE p\.member_id = \?/i)) {
      joined = joined.filter((p: any) => Number(p.member_id) === Number(params[0]));
    }
    return [joined, null];
  }

  if (sqlTrim.match(/UPDATE payments SET/i)) {
    // Check if updating by ID or razorpay_order_id
    db.payments = db.payments || [];
    const lastParam = params[params.length - 1];
    const target = db.payments.find((p: any) => p.id === Number(lastParam) || p.razorpay_order_id === lastParam);
    if (target) {
      if (sqlTrim.match(/payment_link_url\s*=\s*\?/i)) {
        target.payment_link_url = params[0] || target.payment_link_url;
      } else if  (sqlTrim.match(/payment_status = 'Paid'/i)) {
        target.payment_status = "Paid";
        target.razorpay_payment_id = params[0] || target.razorpay_payment_id;
        target.payment_date = new Date().toISOString();
      } else if (sqlTrim.match(/payment_status = 'Refunded'/i)) {
        target.payment_status = "Refunded";
        target.refund_amount = Number(params[0] || target.amount);
        target.refund_status = "Processed";
        target.refund_date = new Date().toISOString();
        target.refund_txn_id = params[1] || `RFD-${Date.now()}`;
      }
      saveMockDb(db);
    }
    return [{ affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/SELECT SUM\(amount\) as total FROM payments/i)) {
    const list = db.payments || [];
    if (sqlTrim.match(/payment_date >= \?/i) || sqlTrim.match(/created_at >= \?/i)) {
      // Today's collection
      const todayStr = new Date().toDateString();
      const total = list
        .filter((p: any) => {
          const isPaid = p.payment_status === "Paid" || p.payment_status === "Successful";
          const dateStr = new Date(p.payment_date || p.created_at).toDateString();
          return isPaid && dateStr === todayStr;
        })
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      return [[{ total }], null];
    } else {
      // Total revenue
      const total = list
        .filter((p: any) => p.payment_status === "Paid" || p.payment_status === "Successful")
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      return [[{ total }], null];
    }
  }

  if (sqlTrim.match(/SELECT COUNT\(DISTINCT member_id\) as count FROM payments/i)) {
    const list = db.payments || [];
    const uniqueMembers = new Set(
      list
        .filter((p: any) => p.payment_status === "Paid" || p.payment_status === "Successful")
        .map((p: any) => p.member_id)
    );
    return [[{ count: uniqueMembers.size }], null];
  }

  if (sqlTrim.match(/SELECT COUNT\(\*\) as count FROM members WHERE payment_status = 'Pending'/i)) {
    const list = db.members || [];
    const count = list.filter((m: any) => m.payment_status === "Pending").length;
    return [[{ count }], null];
  }

  if (sqlTrim.match(/SELECT COUNT\(\*\) as count FROM payments WHERE payment_status = 'Paid' OR payment_status = 'Successful'/i)) {
    const list = db.payments || [];
    const count = list.filter((p: any) => p.payment_status === "Paid" || p.payment_status === "Successful").length;
    return [[{ count }], null];
  }

  if (sqlTrim.match(/SELECT COUNT\(\*\) as count FROM payments WHERE payment_status = 'Failed'/i)) {
    const list = db.payments || [];
    const count = list.filter((p: any) => p.payment_status === "Failed").length;
    return [[{ count }], null];
  }

  if (sqlTrim.match(/SELECT COUNT\(\*\) as count FROM members WHERE registration_status = 'Approved' AND payment_status = 'Pending'/i)) {
    const list = db.members || [];
    const count = list.filter((m: any) => m.registration_status === "Approved" && m.payment_status === "Pending").length;
    return [[{ count }], null];
  }

  // 1. SELECT COUNT
  const countMatch = sqlTrim.match(/SELECT COUNT\(\*\) as count FROM (\w+)/i);
  if (countMatch) {
    const table = countMatch[1].toLowerCase();
    const list = db[table] || [];
    return [[{ count: list.length }], null];
  }

  // 2. Users queries
  if (sqlTrim.match(/SELECT \* FROM users WHERE LOWER\(email\) = LOWER\(\?\)/i)) {
    const email = (params[0] || "").toLowerCase().trim();
    const user = db.users.find((u: any) => u.email.toLowerCase().trim() === email);
    return [user ? [user] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM users WHERE id = \?/i)) {
    const id = Number(params[0]);
    const user = db.users.find((u: any) => u.id === id);
    return [user ? [user] : [], null];
  }
  if (sqlTrim.match(/SELECT id, name, email, phone_number, role, academy_id.*FROM users/i)) {
    const list = db.users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone_number: u.phone_number,
      role: u.role,
      academy_id: u.academy_id,
      photo_url: u.photo_url || null,
      created_at: u.created_at || new Date().toISOString()
    }));
    return [list, null];
  }
  if (sqlTrim.match(/INSERT INTO users/i)) {
    const id = db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1;
    const newUser = {
      id,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      phone_number: params[3],
      role: params[4],
      academy_id: params[5] || "swim",
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }
  if (sqlTrim.match(/DELETE FROM users WHERE id = \?/i)) {
    const id = Number(params[0]);
    const initialLen = db.users.length;
    db.users = db.users.filter((u: any) => u.id !== id);
    saveMockDb(db);
    return [{ affectedRows: initialLen - db.users.length }, null];
  }

  // 3. Batches queries
  if (sqlTrim.match(/SELECT \* FROM batches WHERE id = \?/i)) {
    const id = Number(params[0]);
    const batch = db.batches.find((b: any) => b.id === id);
    return [batch ? [batch] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM batches WHERE batch_name = \?/i)) {
    const name = (params[0] || "").trim();
    const batch = db.batches.find((b: any) => b.batch_name === name);
    return [batch ? [batch] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM batches WHERE batch_name LIKE/i)) {
    const queryStr = (params[0] || "").replace(/%/g, "").toLowerCase().trim();
    const queryStr2 = (params[2] || "").toLowerCase().trim();
    let batch = db.batches.find((b: any) => 
      b.batch_name.toLowerCase().includes(queryStr) || 
      b.start_time.toLowerCase().includes(queryStr) ||
      queryStr2.includes(b.start_time.toLowerCase())
    );
    if (!batch) {
      batch = db.batches[0];
    }
    return [batch ? [batch] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM batches/i)) {
    const whereAcademyId = sqlTrim.match(/WHERE academy_id\s*=\s*\?/i);
    if (whereAcademyId) {
      const academyId = params[0];
      const filtered = db.batches.filter((b: any) => b.academy_id === academyId);
      return [filtered, null];
    }
    return [db.batches, null];
  }
  if (sqlTrim.match(/UPDATE batches SET current_strength = \?, status = \? WHERE id = \?/i)) {
    const strength = Number(params[0]);
    const status = params[1];
    const id = Number(params[2]);
    const batch = db.batches.find((b: any) => b.id === id);
    if (batch) {
      batch.current_strength = strength;
      batch.status = status;
      saveMockDb(db);
    }
    return [{ affectedRows: batch ? 1 : 0 }, null];
  }

  // 4. Membership Plans queries
  if (sqlTrim.match(/SELECT \* FROM membership_plans WHERE id = \?/i)) {
    const id = Number(params[0]);
    const plan = db.membership_plans.find((p: any) => p.id === id);
    return [plan ? [plan] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM membership_plans WHERE LOWER\(name\) = LOWER\(\?\)/i)) {
    const name = (params[0] || "").toLowerCase().trim();
    const plan = db.membership_plans.find((p: any) => p.name.toLowerCase().trim() === name);
    return [plan ? [plan] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM membership_plans WHERE LOWER\(name\) LIKE \?/i)) {
    const name = (params[0] || "").replace(/%/g, "").toLowerCase().trim();
    const plan = db.membership_plans.find((p: any) => p.name.toLowerCase().trim().includes(name));
    return [plan ? [plan] : [], null];
  }
  if (sqlTrim.match(/SELECT \* FROM membership_plans/i)) {
    return [db.membership_plans, null];
  }
  if (sqlTrim.match(/SELECT duration_months FROM membership_plans WHERE id = \?/i)) {
    const plan = db.membership_plans.find((p: any) => Number(p.id) === Number(params[0]));
    return [plan ? [{ duration_months: plan.duration_months }] : [], null];
  }

  // 5. Bookings queries
  if (sqlTrim.match(/SELECT \* FROM bookings WHERE academyId = \?/i)) {
    const academyId = params[0];
    const bookings = db.bookings.filter((b: any) => b.academyId === academyId);
    return [bookings, null];
  }
  if (sqlTrim.match(/SELECT \* FROM bookings ORDER BY id DESC/i)) {
    const bookings = [...db.bookings].reverse();
    return [bookings, null];
  }
  if (sqlTrim.match(/INSERT INTO bookings/i)) {
    const newBooking = {
      id: params[0],
      studentName: params[1],
      academyId: params[2],
      date: params[3],
      timeSlot: params[4],
      facility: params[5],
      status: params[6] || "Confirmed"
    };
    db.bookings.push(newBooking);
    saveMockDb(db);
    return [{ affectedRows: 1 }, null];
  }

  // 6. Members queries
  if (sqlTrim.match(/SELECT m\.\*, p\.name as planName, b\.batch_name as batchName.*FROM members/i) || sqlTrim.match(/SELECT \* FROM members/i)) {
    const whereMembershipNo = sqlTrim.match(/WHERE m\.membershipNo\s*=\s*\?/i) || sqlTrim.match(/WHERE membershipNo\s*=\s*\?/i);
    const whereMobileNo = sqlTrim.match(/WHERE REPLACE\(m\.mobileNo.*LIKE/i) || sqlTrim.match(/WHERE mobileNo\s*=\s*\?/i);
    const whereEmail = sqlTrim.match(/WHERE LOWER\(m\.email\)\s*=\s*LOWER\(\?\)/i) || sqlTrim.match(/WHERE m\.email\s*=\s*\?/i) || sqlTrim.match(/WHERE LOWER\(email\)\s*=\s*LOWER\(\?\)/i) || sqlTrim.match(/WHERE email\s*=\s*\?/i);
    const whereId = sqlTrim.match(/WHERE m\.id\s*=\s*\?/i) || sqlTrim.match(/WHERE id\s*=\s*\?/i);
    const whereAcademyId = sqlTrim.match(/WHERE m\.academyId\s*=\s*\?/i) || sqlTrim.match(/WHERE academyId\s*=\s*\?/i);
    const whereIdOrMemNo = sqlTrim.match(/WHERE id = \? OR membershipNo = \?/i) || sqlTrim.match(/WHERE m\.id = \? OR m\.membershipNo = \?/i);
    const whereSearch = sqlTrim.match(/WHERE fullName LIKE \? OR membershipNo LIKE \?/i);

    let filteredMembers = [...db.members];

    if (whereEmail) {
      const targetEmail = (params[0] || "").toLowerCase().trim();
      filteredMembers = filteredMembers.filter((m: any) => m.email && m.email.toLowerCase().trim() === targetEmail);
    } else if (whereMembershipNo) {
      const memNo = params[0];
      filteredMembers = filteredMembers.filter((m: any) => m.membershipNo === memNo);
    } else if (whereIdOrMemNo) {
      const targetVal = params[0];
      const targetVal2 = params[1] || params[0];
      filteredMembers = filteredMembers.filter((m: any) => m.id === Number(targetVal) || m.membershipNo === targetVal || m.membershipNo === targetVal2);
    } else if (whereId) {
      const targetId = Number(params[0]);
      filteredMembers = filteredMembers.filter((m: any) => m.id === targetId);
    } else if (whereAcademyId) {
      const academyId = params[0];
      filteredMembers = filteredMembers.filter((m: any) => m.academyId === academyId);
    } else if (whereMobileNo) {
      const cleanSearch = (params[0] || "").replace(/%/g, "").replace(/\D/g, "");
      const cleanSearch2 = (params[1] || "").replace(/\D/g, "");
      filteredMembers = filteredMembers.filter((m: any) => {
        const cleanMobile = (m.mobileNo || "").replace(/\D/g, "");
        return cleanMobile.includes(cleanSearch) || (cleanSearch2 && cleanSearch2.includes(cleanMobile));
      });
      if (filteredMembers.length > 1) {
        filteredMembers = [filteredMembers[0]];
      }
    } else if (whereSearch) {
      const searchTerm = (params[0] || "").replace(/%/g, "").toLowerCase();
      filteredMembers = filteredMembers.filter((m: any) => 
        (m.fullName && m.fullName.toLowerCase().includes(searchTerm)) ||
        (m.membershipNo && m.membershipNo.toLowerCase().includes(searchTerm)) ||
        (m.mobileNo && m.mobileNo.includes(searchTerm)) ||
        (m.email && m.email.toLowerCase().includes(searchTerm))
      );
    }

    const resultList = filteredMembers.map((m: any) => {
      const plan = db.membership_plans.find((p: any) => p.id === m.membership_plan_id);
      const batch = db.batches.find((b: any) => b.id === m.selected_batch_id);
      return {
        ...m,
        planName: plan ? plan.name : "General",
        batchName: batch ? batch.batch_name : "Morning Sunrise Batch (A)",
        start_time: batch ? batch.start_time : "06:00 AM",
        end_time: batch ? batch.end_time : "07:00 AM"
      };
    });

    console.log(`🔍 [DB QUERY] SELECT members | Params: ${JSON.stringify(params || [])} | Returned Rows: ${resultList.length}`);
    return [resultList, null];
  }

  if (sqlTrim.match(/INSERT INTO members/i)) {
    const id = db.members.length > 0 ? Math.max(...db.members.map((m: any) => m.id)) + 1 : 1;
    const newMember = {
      id,
      membershipNo: params[0],
      applicationNo: params[1],
      fullName: params[2],
      email: params[3],
      mobileNo: params[4],
      gender: params[5],
      age: params[6],
      dateOfBirth: params[7],
      addressLine1: params[8],
      city: params[9],
      state: params[10],
      pincode: params[11],
      emergencyName: params[12],
      emergencyPhone: params[13],
      emergencyMobile: params[14],
      emergencyRelation: params[15],
      hasMedicalCondition: params[16],
      medicalDetails: params[17],
      bloodGroup: params[18] || "O+",
      academyId: params[19] || "swim",
      selected_batch_id: params[20] ? Number(params[20]) : null,
      membership_plan_id: params[21] ? Number(params[21]) : null,
      registration_status: params[22] || "Pending",
      payment_status: params[23] || "Pending",
      membership_status: params[24] || "Inactive",
      login_enabled: params[25] ? 1 : 0,
      registrationDate: params[26] || new Date().toLocaleDateString(),
      photoUrl: params[27],
      amountPaid: params[28] ? Number(params[28]) : 0,
      paymentMethod: params[29],
      paymentDate: params[30],
      txnId: params[31],
      remarks: "",
      created_at: new Date().toISOString()
    };
    db.members.push(newMember);
    saveMockDb(db);
    console.log(`✅ [DB EXEC] INSERT INTO members SUCCESS | ID: ${id} | Name: ${newMember.fullName} | Email: ${newMember.email} | Mobile: ${newMember.mobileNo}`);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/UPDATE members/i)) {
    if (sqlTrim.match(/payment_status = 'Paid'/i) && sqlTrim.match(/WHERE id = \?/i)) {
      const member = db.members.find((m: any) => Number(m.id) === Number(params[params.length - 1]));
      if (member) {
        member.payment_status = "Paid";
        member.registration_status = "Approved";
        member.membership_status = "Active";
        member.login_enabled = 1;
        member.amountPaid = Number(params[0] || member.amountPaid || 0);
        member.paymentMethod = "Razorpay";
        member.paymentDate = new Date().toISOString();
        member.txnId = params[1];
        member.membership_start_date = params[2];
        member.membership_end_date = params[3];
        member.next_renewal_date = params[4];
        member.last_payment_id = Number(params[5]);
        saveMockDb(db);
        return [{ affectedRows: 1 }, null];
      }
    }
    const updateMatch = sqlTrim.match(/UPDATE members\s+SET\s+(.+?)\s+WHERE\s+membershipNo\s*=\s*\?/i);
    if (updateMatch) {
      const setClause = updateMatch[1];
      const columns = setClause.split(",").map(c => c.split("=")[0].trim());
      const membershipNo = params[params.length - 1];

      const member = db.members.find((m: any) => m.membershipNo === membershipNo);
      if (member) {
        columns.forEach((col, index) => {
          let val = params[index];
          if (col === "login_enabled") val = val ? 1 : 0;
          if (col === "selected_batch_id") val = val ? Number(val) : null;
          if (col === "membership_plan_id") val = val ? Number(val) : null;
          member[col] = val;
        });
        saveMockDb(db);
        return [{ affectedRows: 1 }, null];
      }
    }
    return [{ affectedRows: 0 }, null];
  }

  if (sqlTrim.match(/DELETE FROM members WHERE membershipNo = \?/i)) {
    const memNo = params[0];
    const initialLen = db.members.length;
    db.members = db.members.filter((m: any) => m.membershipNo !== memNo);
    saveMockDb(db);
    return [{ affectedRows: initialLen - db.members.length }, null];
  }

  // Support ALTER TABLE
  if (sqlTrim.match(/ALTER TABLE/i)) {
    return [{ affectedRows: 0 }, null];
  }

  // 7. Membership Plans Write CRUD mock
  if (sqlTrim.match(/INSERT INTO membership_plans/i)) {
    const id = db.membership_plans.length > 0 ? Math.max(...db.membership_plans.map((p: any) => p.id)) + 1 : 1;
    const newPlan = {
      id,
      name: params[0],
      duration_months: Number(params[1]),
      registration_fee: Number(params[2]),
      renewal_fee: Number(params[3]),
      co_charge: Number(params[4]),
      description: params[5] || "",
      is_active: params[6] !== undefined ? (params[6] ? 1 : 0) : 1,
      created_at: new Date().toISOString()
    };
    db.membership_plans.push(newPlan);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/UPDATE membership_plans SET/i)) {
    const id = Number(params[params.length - 1]);
    const plan = db.membership_plans.find((p: any) => p.id === id);
    if (plan) {
      plan.name = params[0];
      plan.duration_months = Number(params[1]);
      plan.registration_fee = Number(params[2]);
      plan.renewal_fee = Number(params[3]);
      plan.co_charge = Number(params[4]);
      plan.description = params[5] || "";
      plan.is_active = params[6] ? 1 : 0;
      saveMockDb(db);
      return [{ affectedRows: 1 }, null];
    }
    return [{ affectedRows: 0 }, null];
  }

  if (sqlTrim.match(/DELETE FROM membership_plans WHERE id = \?/i)) {
    const id = Number(params[0]);
    const initialLen = db.membership_plans.length;
    db.membership_plans = db.membership_plans.filter((p: any) => p.id !== id);
    saveMockDb(db);
    return [{ affectedRows: initialLen - db.membership_plans.length }, null];
  }

  // 8. Batches Write CRUD mock
  if (sqlTrim.match(/INSERT INTO batches/i)) {
    const id = db.batches.length > 0 ? Math.max(...db.batches.map((b: any) => b.id)) + 1 : 1;
    const newBatch = {
      id,
      academy_id: params[0] || "swim",
      batch_name: params[1],
      start_time: params[2],
      end_time: params[3],
      capacity: Number(params[4]),
      current_strength: params[5] ? Number(params[5]) : 0,
      status: params[6] || "OPEN",
      created_at: new Date().toISOString()
    };
    db.batches.push(newBatch);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/UPDATE batches SET/i) && !sqlTrim.match(/current_strength = \?, status = \?/)) {
    const id = Number(params[params.length - 1]);
    const batch = db.batches.find((b: any) => b.id === id);
    if (batch) {
      batch.academy_id = params[0] || "swim";
      batch.batch_name = params[1];
      batch.start_time = params[2];
      batch.end_time = params[3];
      batch.capacity = Number(params[4]);
      batch.current_strength = Number(params[5]);
      batch.status = params[6];
      saveMockDb(db);
      return [{ affectedRows: 1 }, null];
    }
    return [{ affectedRows: 0 }, null];
  }

  if (sqlTrim.match(/DELETE FROM batches WHERE id = \?/i)) {
    const id = Number(params[0]);
    const initialLen = db.batches.length;
    db.batches = db.batches.filter((b: any) => b.id !== id);
    saveMockDb(db);
    return [{ affectedRows: initialLen - db.batches.length }, null];
  }

  // 9. Users status/role/password mock update
  if (sqlTrim.match(/UPDATE users/i)) {
    const id = Number(params[params.length - 1]);
    const user = db.users.find((u: any) => u.id === id);
    if (user) {
      if (sqlTrim.includes("is_active = ?")) {
        user.is_active = params[0] ? 1 : 0;
      } else if (sqlTrim.includes("role = ?")) {
        user.role = params[0];
      } else if (sqlTrim.includes("password_hash = ?")) {
        user.password_hash = params[0];
      } else if (sqlTrim.includes("name = ?") && sqlTrim.includes("email = ?")) {
        user.name = params[0];
        user.email = params[1];
        user.phone_number = params[2];
        user.photo_url = params[3];
      }
      saveMockDb(db);
      return [{ affectedRows: 1 }, null];
    }
    return [{ affectedRows: 0 }, null];
  }

  // 10. Payments & Renewals selection/insertion mocks
  if (sqlTrim.match(/SELECT \* FROM payments WHERE id = \?/i)) {
    const id = Number(params[0]);
    const payments = (db.payments || []).filter((p: any) => Number(p.id) === id);
    return [payments, null];
  }

  if (sqlTrim.match(/SELECT \* FROM payments WHERE razorpay_order_id = \?/i)) {
    const orderId = String(params[0]);
    const payments = (db.payments || []).filter((p: any) => p.razorpay_order_id === orderId);
    return [payments, null];
  }

  if (sqlTrim.match(/SELECT \* FROM payments WHERE member_id = \?/i)) {
    const memberId = Number(params[0]);
    let payments = (db.payments || []).filter((p: any) => Number(p.member_id) === memberId);
    if (sqlTrim.match(/payment_status\s*=\s*'Pending'/i)) {
      payments = payments.filter((p: any) => p.payment_status === "Pending");
    }
    if (sqlTrim.match(/razorpay_order_id IS NOT NULL/i)) {
      payments = payments.filter((p: any) => Boolean(p.razorpay_order_id));
    }
    return [payments, null];
  }

  if (sqlTrim.match(/SELECT \* FROM renewals WHERE member_id = \?/i)) {
    const memberId = Number(params[0]);
    const renewals = (db.renewals || []).filter((r: any) => Number(r.member_id) === memberId);
    return [renewals, null];
  }

  if (sqlTrim.match(/INSERT INTO payments/i)) {
    const id = (db.payments || []).length + 1;
    let p: any = { id, created_at: new Date().toISOString() };
    // Support multiple INSERT signatures: if SQL includes payment_link_url column, follow that order
    if (sqlTrim.includes('payment_link_url')) {
      const hasRegistrationId = /\(member_id, registration_id, membership_plan_id/i.test(sqlTrim);
      const offset = hasRegistrationId ? 1 : 0;
      p.member_id = Number(params[0]);
      p.registration_id = hasRegistrationId ? Number(params[1]) : null;
      p.membership_plan_id = Number(params[1 + offset]);
      p.payment_type = params[2 + offset] || 'Registration';
      p.amount = Number(params[3 + offset]);
      p.registration_fee = Number(params[4 + offset] || 0);
      p.renewal_fee = Number(params[5 + offset] || 0);
      p.payment_status = params[6 + offset] || 'Pending';
      p.payment_method = params[7 + offset] || 'Razorpay';
      p.razorpay_order_id = params[8 + offset] || null;
      p.payment_link_url = params[9 + offset] || null;
      p.approved_by = params[10 + offset] || null;
      p.receipt_no = params[11 + offset] || null;
      p.invoice_no = params[12 + offset] || null;
      p.payment_link_created_at = new Date().toISOString();
      p.payment_date = new Date().toISOString();
    } else {
      p = {
        id,
        member_id: Number(params[0]),
        membership_plan_id: Number(params[1]),
        amount: Number(params[2]),
        payment_status: params[3] || "Pending",
        payment_method: params[4] || "UPI",
        razorpay_payment_id: params[5] || null,
        razorpay_order_id: params[6] || null,
        payment_date: params[7] || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    }
    db.payments = db.payments || [];
    db.payments.push(p);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/SHOW COLUMNS FROM payments/i)) {
    return [[
      { Field: "id", Type: "int unsigned" },
      { Field: "member_id", Type: "int unsigned" },
      { Field: "registration_id", Type: "int unsigned" },
      { Field: "membership_plan_id", Type: "int unsigned" },
      { Field: "payment_type", Type: "varchar(50)" },
      { Field: "amount", Type: "decimal(10,2)" },
      { Field: "registration_fee", Type: "decimal(10,2)" },
      { Field: "renewal_fee", Type: "decimal(10,2)" },
      { Field: "payment_status", Type: "varchar(50)" },
      { Field: "payment_method", Type: "varchar(50)" },
      { Field: "razorpay_order_id", Type: "varchar(100)" },
      { Field: "razorpay_payment_id", Type: "varchar(100)" },
      { Field: "razorpay_signature", Type: "varchar(255)" },
      { Field: "payment_link_url", Type: "varchar(500)" },
      { Field: "failure_reason", Type: "text" },
      { Field: "approved_by", Type: "varchar(100)" },
      { Field: "receipt_no", Type: "varchar(100)" },
      { Field: "invoice_no", Type: "varchar(100)" },
      { Field: "payment_date", Type: "timestamp" },
      { Field: "created_at", Type: "timestamp" }
    ], null];
  }

  if (sqlTrim.match(/SHOW TABLES/i)) {
    return [[
      { Tables_in_bsfms_db: "academies" },
      { Tables_in_bsfms_db: "users" },
      { Tables_in_bsfms_db: "membership_plans" },
      { Tables_in_bsfms_db: "batches" },
      { Tables_in_bsfms_db: "members" },
      { Tables_in_bsfms_db: "payments" },
      { Tables_in_bsfms_db: "renewals" },
      { Tables_in_bsfms_db: "attendance" },
      { Tables_in_bsfms_db: "activity_logs" }
    ], null];
  }

  if (sqlTrim.match(/INSERT INTO renewals/i)) {
    const id = (db.renewals || []).length + 1;
    const r = {
      id,
      member_id: Number(params[0]),
      due_date: params[1],
      amount: Number(params[2]),
      status: params[3] || "Pending",
      payment_id: params[4] ? Number(params[4]) : null,
      created_at: new Date().toISOString()
    };
    db.renewals = db.renewals || [];
    db.renewals.push(r);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/INSERT INTO attendance/i)) {
    const id = (db.attendance || []).length + 1;
    const a = {
      id,
      member_id: Number(params[0]),
      date: params[1],
      time: params[2],
      checked_in_by: params[3],
      created_at: new Date().toISOString()
    };
    db.attendance = db.attendance || [];
    db.attendance.push(a);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/SELECT a\.\*, m\.fullName, m\.membershipNo/i) || sqlTrim.match(/FROM attendance a INNER JOIN members m/i)) {
    const whereAcademyId = sqlTrim.match(/WHERE m\.academyId\s*=\s*\?/i);
    let list = db.attendance || [];
    if (whereAcademyId) {
      const academyId = params[0];
      const academyMembers = db.members.filter((m: any) => m.academyId === academyId);
      const academyMemberIds = new Set(academyMembers.map((m: any) => m.id));
      list = list.filter((a: any) => academyMemberIds.has(Number(a.member_id)));
    }
    const resultList = list.map((a: any) => {
      const m = db.members.find((member: any) => member.id === Number(a.member_id));
      return {
        ...a,
        fullName: m ? m.fullName : "Unknown Swimmer",
        membershipNo: m ? m.membershipNo : "MEM-UNKNOWN",
        selected_batch_id: m ? m.selected_batch_id : null
      };
    });
    return [resultList, null];
  }

  if (sqlTrim.match(/SELECT \* FROM notifications/i)) {
    return [db.notifications || [], null];
  }

  if (sqlTrim.match(/SELECT \* FROM attendance/i)) {
    let list = db.attendance || [];
    if (sqlTrim.match(/WHERE date = \?/i)) {
      list = list.filter((a: any) => a.date === params[0]);
    } else if (sqlTrim.match(/WHERE member_id = \?/i)) {
      list = list.filter((a: any) => Number(a.member_id) === Number(params[0]));
    }
    return [list, null];
  }

  if (sqlTrim.match(/INSERT INTO events/i)) {
    const id = (db.events || []).length + 1;
    const ev = {
      id,
      title: params[0],
      description: params[1],
      event_date: params[2],
      start_time: params[3],
      end_time: params[4],
      location: params[5] || "Main Pool Deck",
      created_at: new Date().toISOString()
    };
    db.events = db.events || [];
    db.events.push(ev);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/DELETE FROM events/i)) {
    db.events = (db.events || []).filter((e: any) => Number(e.id) !== Number(params[0]));
    saveMockDb(db);
    return [{ affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/INSERT INTO holidays/i)) {
    const id = (db.holidays || []).length + 1;
    const h = {
      id,
      name: params[0],
      holiday_date: params[1],
      created_at: new Date().toISOString()
    };
    db.holidays = db.holidays || [];
    db.holidays.push(h);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/DELETE FROM holidays/i)) {
    db.holidays = (db.holidays || []).filter((h: any) => Number(h.id) !== Number(params[0]));
    saveMockDb(db);
    return [{ affectedRows: 1 }, null];
  }

  if (sqlTrim.match(/SELECT \* FROM events/i)) {
    return [db.events || [], null];
  }

  if (sqlTrim.match(/SELECT \* FROM holidays/i)) {
    return [db.holidays || [], null];
  }

  if (sqlTrim.match(/SELECT \* FROM renewals/i)) {
    return [db.renewals || [], null];
  }

  // Activities insert
  if (sqlTrim.match(/INSERT INTO activities/i)) {
    const id = (db.activities || []).length + 1;
    const act = {
      id,
      userName: params[0],
      action: params[1],
      status: params[2],
      performedBy: params[3],
      date_time: new Date().toISOString()
    };
    db.activities = db.activities || [];
    db.activities.push(act);
    saveMockDb(db);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  // Activities select
  if (sqlTrim.match(/FROM activities/i)) {
    const list = (db.activities || []).map((a: any) => ({
      id: a.id,
      userName: a.userName,
      action: a.action,
      date_time: a.date_time ? a.date_time.replace("T", " ").substring(0, 19) : new Date().toISOString().replace("T", " ").substring(0, 19),
      status: a.status,
      performedBy: a.performedBy
    })).sort((a: any, b: any) => b.id - a.id);
    return [list, null];
  }

  console.log(`⚠️ Unhandled query in fallback mode: ${sqlTrim}`);
  return [[], null];
}

function createMockPool(): any {
  console.log("🌱 SAMS File/In-Memory Mock Database Pool initialized.");
  const mockPool = {
    query: async (sql: string, params?: any[]) => {
      return executeMockQuery(sql, params);
    },
    getConnection: async () => {
      return {
        query: async (sql: string, params?: any[]) => {
          return executeMockQuery(sql, params);
        },
        release: () => {},
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {}
      };
    },
    end: async () => {
      console.log("Mock Pool closed.");
    }
  };
  return mockPool as any;
}
