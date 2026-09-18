export function validateRuntimeConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "APP_URL",
    "APP_BASE_URL",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "MSG91_AUTHKEY",
    "MSG91_INTEGRATED_NUMBER",
    "WHATSAPP_TEMPLATE_NAME",
    "WHATSAPP_NAMESPACE"
  ];

  if (process.env.REQUIRE_OBJECT_STORAGE !== "false") {
    required.push(
      "SPACES_BUCKET",
      "SPACES_REGION",
      "SPACES_ACCESS_KEY_ID",
      "SPACES_SECRET_ACCESS_KEY"
    );
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
