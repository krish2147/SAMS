export function validateRuntimeConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "APP_URL",
    "APP_BASE_URL"
  ];

  // Several settings legitimately arrive under more than one name: managed MySQL add-ons
  // inject MYSQL*/MYSQL_URL rather than DB_*, and the MSG91 integration was renamed. Each
  // group below is satisfied by any one of its variables, so a correct deployment is not
  // rejected for using the host's own convention.
  const eitherOf: Array<{ label: string; keys: string[] }> = [
    { label: "database host (DB_HOST / MYSQLHOST / DATABASE_URL / MYSQL_URL)", keys: ["DB_HOST", "MYSQLHOST", "DATABASE_URL", "MYSQL_URL"] },
    { label: "database user (DB_USER / MYSQLUSER / DATABASE_URL / MYSQL_URL)", keys: ["DB_USER", "MYSQLUSER", "DATABASE_URL", "MYSQL_URL"] },
    { label: "database password (DB_PASSWORD / MYSQLPASSWORD / DATABASE_URL / MYSQL_URL)", keys: ["DB_PASSWORD", "MYSQLPASSWORD", "DATABASE_URL", "MYSQL_URL"] },
    { label: "database name (DB_NAME / MYSQLDATABASE / DATABASE_URL / MYSQL_URL)", keys: ["DB_NAME", "MYSQLDATABASE", "DATABASE_URL", "MYSQL_URL"] },
    { label: "Razorpay key id (RAZORPAY_KEY_ID)", keys: ["RAZORPAY_KEY_ID"] },
    { label: "Razorpay key secret (RAZORPAY_KEY_SECRET)", keys: ["RAZORPAY_KEY_SECRET"] },
    { label: "Razorpay webhook secret (RAZORPAY_WEBHOOK_SECRET)", keys: ["RAZORPAY_WEBHOOK_SECRET"] },
    { label: "MSG91 auth key (MSG91_AUTH_KEY / MSG91_AUTHKEY)", keys: ["MSG91_AUTH_KEY", "MSG91_AUTHKEY"] },
    // WhatsApp goes through MSG91 by default, or straight through Meta with WHATSAPP_PROVIDER=meta.
    ...((process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase() === "meta"
      ? [
          { label: "Meta WhatsApp token (WHATSAPP_API_TOKEN)", keys: ["WHATSAPP_API_TOKEN"] },
          { label: "Meta WhatsApp phone number ID (WHATSAPP_PHONE_NUMBER_ID)", keys: ["WHATSAPP_PHONE_NUMBER_ID"] }
        ]
      : [
          { label: "WhatsApp sender number (MSG91_WHATSAPP_NUMBER / MSG91_INTEGRATED_NUMBER)", keys: ["MSG91_WHATSAPP_NUMBER", "MSG91_INTEGRATED_NUMBER"] },
          { label: "WhatsApp namespace (MSG91_WHATSAPP_NAMESPACE / WHATSAPP_NAMESPACE)", keys: ["MSG91_WHATSAPP_NAMESPACE", "WHATSAPP_NAMESPACE"] }
        ]),
    { label: "OTP hash secret (OTP_HASH_SECRET)", keys: ["OTP_HASH_SECRET"] }
  ];

  if (process.env.REQUIRE_OBJECT_STORAGE !== "false") {
    required.push(
      "SPACES_BUCKET",
      "SPACES_REGION",
      "SPACES_ACCESS_KEY_ID",
      "SPACES_SECRET_ACCESS_KEY"
    );
  }

  const unsatisfied = eitherOf
    .filter(group => !group.keys.some(key => process.env[key]?.trim()))
    .map(group => group.label);
  if (unsatisfied.length > 0) {
    throw new Error(`Missing required production configuration: ${unsatisfied.join("; ")}`);
  }

  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  for (const urlKey of ["APP_URL", "APP_BASE_URL"] as const) {
    const value = process.env[urlKey]!;
    if (!value.startsWith("https://")) {
      throw new Error(`${urlKey} must use HTTPS in production.`);
    }
  }
}
