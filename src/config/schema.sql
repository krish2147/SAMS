-- =================================================================================
-- SAMS Swimming Academy Membership Management System - Production MySQL Schema
-- =================================================================================

-- 1. ACADEMIES
CREATE TABLE IF NOT EXISTS academies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. USERS (Admins, Coaches, Staff, Receptionists)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  academy_id VARCHAR(50) DEFAULT 'swim',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_user_email (email),
  INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- 3. MEMBERSHIP PLANS
CREATE TABLE IF NOT EXISTS membership_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  duration_months INT UNSIGNED NOT NULL DEFAULT 1,
  registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  renewal_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  co_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. BATCHES
CREATE TABLE IF NOT EXISTS batches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  academy_id VARCHAR(50) DEFAULT 'swim',
  batch_name VARCHAR(100) NOT NULL,
  start_time VARCHAR(50) NOT NULL,
  end_time VARCHAR(50) NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  current_strength INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_batch_status (status)
) ENGINE=InnoDB;

-- 5. MEMBERS
CREATE TABLE IF NOT EXISTS members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  membershipNo VARCHAR(50) UNIQUE NULL,
  applicationNo VARCHAR(50) UNIQUE NULL,
  fullName VARCHAR(100) NOT NULL,
  email VARCHAR(100) NULL,
  mobileNo VARCHAR(15) UNIQUE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  age VARCHAR(10) NULL,
  dateOfBirth VARCHAR(50) NULL,
  addressLine1 TEXT NULL,
  addressLine2 TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  pincode VARCHAR(10) NULL,
  parentName VARCHAR(100) NULL,
  parentMobile VARCHAR(15) NULL,
  parentRelation VARCHAR(50) NULL,
  emergencyName VARCHAR(100) NULL,
  emergencyPhone VARCHAR(15) NULL,
  emergencyMobile VARCHAR(15) NULL,
  emergencyRelation VARCHAR(50) NULL,
  hasMedicalCondition VARCHAR(10) DEFAULT 'No',
  medicalDetails TEXT NULL,
  disability VARCHAR(100) DEFAULT 'N/A',
  bloodGroup VARCHAR(20) DEFAULT 'O+',
  height VARCHAR(20) NULL,
  weight VARCHAR(20) NULL,
  relationToUndertaker VARCHAR(50) NULL,
  undertakerParentName VARCHAR(100) NULL,
  typedSignature VARCHAR(100) NULL,
  signatureDataUrl TEXT NULL,
  photoUrl VARCHAR(255) NULL,
  registrationDate VARCHAR(50) NULL,
  amountPaid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paymentMethod VARCHAR(50) NULL,
  paymentDate VARCHAR(50) NULL,
  txnId VARCHAR(100) NULL,
  remarks TEXT NULL,
  academyId VARCHAR(50) DEFAULT 'swim',
  membership_plan_id INT UNSIGNED NULL,
  selected_batch_id INT UNSIGNED NULL,
  registration_status VARCHAR(50) DEFAULT 'Pending',
  payment_status VARCHAR(50) DEFAULT 'Pending',
  membership_status VARCHAR(50) DEFAULT 'Inactive',
  login_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (academyId) REFERENCES academies(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (selected_batch_id) REFERENCES batches(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_member_mobile (mobileNo),
  INDEX idx_member_membership_status (membership_status),
  INDEX idx_member_registration_status (registration_status),
  INDEX idx_member_payment_status (payment_status),
  INDEX idx_member_created_at (created_at)
) ENGINE=InnoDB;

-- 6. MEMBER BATCHES
CREATE TABLE IF NOT EXISTS member_batches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  registration_id INT UNSIGNED NULL,
  membership_plan_id INT UNSIGNED NOT NULL,
  payment_type VARCHAR(50) NOT NULL DEFAULT 'Registration',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  renewal_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  payment_method VARCHAR(50) NULL DEFAULT 'Razorpay',
  razorpay_order_id VARCHAR(100) NULL,
  razorpay_payment_id VARCHAR(100) NULL,
  razorpay_signature VARCHAR(255) NULL,
  payment_link_url VARCHAR(500) NULL,
  failure_reason TEXT NULL,
  approved_by VARCHAR(100) NULL DEFAULT 'System Admin',
  receipt_no VARCHAR(100) NULL,
  invoice_no VARCHAR(100) NULL,
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  refund_status VARCHAR(50) NULL,
  refund_date TIMESTAMP NULL DEFAULT NULL,
  refund_txn_id VARCHAR(100) NULL,
  payment_link_created_at TIMESTAMP NULL DEFAULT NULL,
  gateway_response TEXT NULL,
  payment_date TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_payments_razorpay_order (razorpay_order_id),
  UNIQUE KEY uq_payments_razorpay_payment (razorpay_payment_id),
  INDEX idx_payments_member_status (member_id, payment_status),
  INDEX idx_payments_created_at (created_at)
) ENGINE=InnoDB;

-- Durable login sessions shared across application replicas
CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL DEFAULT '',
  role VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  academy_id VARCHAR(50) NOT NULL DEFAULT 'swim',
  photo_url LONGTEXT NULL,
  phone_number VARCHAR(20) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_expiry (expires_at),
  INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB;

-- Durable retries for WhatsApp and other outbound notifications
CREATE TABLE IF NOT EXISTS outbound_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  dedupe_key VARCHAR(150) NOT NULL UNIQUE,
  payload JSON NOT NULL,
  status ENUM('Pending', 'Processing', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_outbound_jobs_ready (status, next_attempt_at)
) ENGINE=InnoDB;

-- 8. RENEWALS
CREATE TABLE IF NOT EXISTS renewals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  payment_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. OTP VERIFICATIONS
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_mobile (mobile)
) ENGINE=InnoDB;

-- 10. EVENTS
CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(150) DEFAULT 'Main Pool Deck',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  holiday_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 13. BOOKINGS (Compatibility table for current frontend feature)
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(50) PRIMARY KEY,
  studentName VARCHAR(100) NOT NULL,
  academyId VARCHAR(50) DEFAULT 'swim',
  date VARCHAR(50) NOT NULL,
  timeSlot VARCHAR(100) NOT NULL,
  facility VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
  FOREIGN KEY (academyId) REFERENCES academies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 14. ACTIVITIES (For Recent Activity tracking)
CREATE TABLE IF NOT EXISTS activities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userName VARCHAR(100) NOT NULL,
  action VARCHAR(150) NOT NULL,
  date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  performedBy VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 15. ATTENDANCE (For Member Attendance tracking)
CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  checked_in_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY unique_member_date (member_id, date)
) ENGINE=InnoDB;

-- 16. COMMUNICATION TEMPLATES
CREATE TABLE IF NOT EXISTS communication_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  whatsapp_template_name VARCHAR(100) NULL,
  whatsapp_content TEXT NULL,
  sms_content TEXT NULL,
  email_subject VARCHAR(200) NULL,
  email_body_html TEXT NULL,
  channels VARCHAR(100) NOT NULL DEFAULT 'whatsapp,email,sms',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. COMMUNICATION LOGS
CREATE TABLE IF NOT EXISTS communication_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NULL,
  member_name VARCHAR(150) NOT NULL,
  mobile_no VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  event_key VARCHAR(100) NOT NULL,
  message_title VARCHAR(200) NOT NULL,
  channel_whatsapp VARCHAR(20) DEFAULT 'Delivered',
  channel_sms VARCHAR(20) DEFAULT 'Delivered',
  channel_email VARCHAR(20) DEFAULT 'Delivered',
  whatsapp_response TEXT NULL,
  sms_response TEXT NULL,
  email_response TEXT NULL,
  status VARCHAR(50) DEFAULT 'Delivered',
  sent_by VARCHAR(100) DEFAULT 'System Trigger',
  recipient_group VARCHAR(100) NULL,
  content_preview TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
