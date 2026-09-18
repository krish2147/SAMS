import assert from "node:assert/strict";
import test from "node:test";
import { validateRuntimeConfiguration } from "../config/runtime";
import { formatDateOnlyForWhatsApp } from "../utils/membership-date";
import {
  buildPaymentInvoiceTemplateRequest,
  buildPaymentLinkTemplateRequest,
  buildPaymentSuccessTemplateRequest,
  formatMsg91FailureDiagnostic,
  formatWhatsAppAmount,
  MSG91_WHATSAPP_BULK_ENDPOINT
} from "./whatsapp.service";

const provider = {
  integratedNumber: "919999999999",
  namespace: "approved_namespace"
};

test("payment_link uses member, plan, amount and the Razorpay URL as body text without a button", () => {
  const request = buildPaymentLinkTemplateRequest({
    ...provider,
    templateName: "payment_link",
    phoneNumber: "+91 98765 43210",
    memberName: "Test Member",
    membershipName: "Learners 6 Days - 1 Month",
    amount: "2500.00",
    paymentLink: "https://rzp.io/i/real-link"
  });
  assert.deepEqual(request.payload.template.to_and_components[0].components, {
    body_1: { type: "text", value: "Test Member" },
    body_2: { type: "text", value: "Learners 6 Days - 1 Month" },
    body_3: { type: "text", value: "2500" },
    body_4: { type: "text", value: "https://rzp.io/i/real-link" }
  });
  assert.equal("button_1" in request.payload.template.to_and_components[0].components, false);
});

test("payment_success uses the exact six-variable order and stored calendar dates", () => {
  const request = buildPaymentSuccessTemplateRequest({
    ...provider,
    templateName: "payment_success",
    phoneNumber: "+91 98765 43210",
    memberName: "Test Member",
    amount: 2500,
    membershipNo: "BSF-TEST-1",
    receiptNo: "BSF-REC-2026-1",
    membershipStartDate: "2026-06-04",
    membershipEndDate: "2026-07-03"
  });
  assert.deepEqual(request.payload.template.to_and_components[0].components, {
    body_1: { type: "text", value: "Test Member" },
    body_2: { type: "text", value: "2500" },
    body_3: { type: "text", value: "BSF-TEST-1" },
    body_4: { type: "text", value: "BSF-REC-2026-1" },
    body_5: { type: "text", value: "04/06/2026" },
    body_6: { type: "text", value: "03/07/2026" }
  });
});

test("payment_invoice uses the exact five-variable order and signed PDF URL", () => {
  const invoiceUrl = "https://sams.example.test/api/payments/42/invoice/public?token=signed";
  const request = buildPaymentInvoiceTemplateRequest({
    ...provider,
    templateName: "payment_invoice",
    phoneNumber: "9876543210",
    memberName: "Test Member",
    invoiceNo: "BSF-INV-2026-1",
    amount: 2500,
    membershipStartDate: "2026-06-04",
    membershipEndDate: "2026-07-03",
    invoiceUrl
  });
  assert.deepEqual(request.payload.template.to_and_components[0].components, {
    body_1: { type: "text", value: "Test Member" },
    body_2: { type: "text", value: "BSF-INV-2026-1" },
    body_3: { type: "text", value: "2500" },
    body_4: { type: "text", value: "04/06/2026" },
    body_5: { type: "text", value: "03/07/2026" },
    header_1: { type: "document", value: invoiceUrl, filename: "BSF-INV-2026-1.pdf" }
  });
});

test("date-only WhatsApp formatting does not shift ISO calendar dates", () => {
  assert.equal(formatDateOnlyForWhatsApp("2026-06-04"), "04/06/2026");
  assert.equal(formatDateOnlyForWhatsApp("2026-07-03T00:00:00.000Z"), "03/07/2026");
});

test("missing or fabricated critical values fail before a request can be sent", () => {
  const valid = {
    ...provider,
    templateName: "payment_success",
    phoneNumber: "9876543210",
    memberName: "Test Member",
    amount: 2500,
    membershipNo: "BSF-1",
    receiptNo: "REC-1",
    membershipStartDate: "2026-06-04",
    membershipEndDate: "2026-07-03"
  };
  for (const [field, value] of [["memberName", ""], ["membershipNo", "N/A"], ["receiptNo", null],
    ["membershipStartDate", ""], ["membershipEndDate", "invalid"], ["phoneNumber", "123"]] as const) {
    assert.throws(() => buildPaymentSuccessTemplateRequest({ ...valid, [field]: value } as any), /required|valid|date|mobile/i);
  }
  assert.throws(() => formatWhatsAppAmount("₹2500"), /rupee amount/i);
  assert.throws(() => formatWhatsAppAmount(0), /positive/i);
});

test("MSG91 failure diagnostics expose routing context but redact credentials and phone numbers", () => {
  const authKey = "do-not-print-this-auth-key";
  const request = buildPaymentLinkTemplateRequest({
    ...provider,
    templateName: "payment_link",
    phoneNumber: "919876543210",
    memberName: "Test Member",
    membershipName: "General",
    amount: 3000,
    paymentLink: "https://rzp.io/i/test"
  });
  const diagnostic = formatMsg91FailureDiagnostic({
    response: { status: 404, data: { message: `sender 919999999999 authkey=${authKey} was not found` } }
  }, "payment_link", request, authKey);
  assert.match(diagnostic, /status=404/);
  assert.match(diagnostic, new RegExp(`endpoint=${new URL(MSG91_WHATSAPP_BULK_ENDPOINT).pathname}`));
  assert.match(diagnostic, /template=payment_link templateId=not-requested/);
  assert.match(diagnostic, /sender=\*{8}9999 recipient=\*{8}3210/);
  assert.doesNotMatch(diagnostic, /do-not-print-this-auth-key|919999999999|919876543210/);
  assert.match(diagnostic, /\[redacted\]/);
});

test("production config uses all three approved template names while IDs remain optional", () => {
  const keys = ["NODE_ENV", "APP_URL", "APP_BASE_URL", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME",
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "MSG91_AUTH_KEY",
    "MSG91_OTP_TEMPLATE_ID", "OTP_HASH_SECRET", "MSG91_WHATSAPP_NUMBER", "MSG91_PAYMENT_LINK_TEMPLATE",
    "MSG91_WHATSAPP_NAMESPACE", "MSG91_PAYMENT_SUCCESS_TEMPLATE", "MSG91_INVOICE_TEMPLATE", "REQUIRE_OBJECT_STORAGE",
    "MSG91_AUTHKEY", "MSG91_INTEGRATED_NUMBER", "WHATSAPP_NAMESPACE", "WHATSAPP_TEMPLATE_NAME"];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      NODE_ENV: "production", APP_URL: "https://example.test", APP_BASE_URL: "https://example.test",
      DB_HOST: "db", DB_USER: "user", DB_PASSWORD: "password", DB_NAME: "sams", RAZORPAY_KEY_ID: "key",
      RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "webhook", MSG91_AUTH_KEY: "auth",
      MSG91_OTP_TEMPLATE_ID: "otp", OTP_HASH_SECRET: "otp-secret", MSG91_WHATSAPP_NUMBER: "919876543210",
      MSG91_PAYMENT_LINK_TEMPLATE: "payment_link", MSG91_WHATSAPP_NAMESPACE: "approved_namespace",
      MSG91_PAYMENT_SUCCESS_TEMPLATE: "payment_success", MSG91_INVOICE_TEMPLATE: "payment_invoice",
      REQUIRE_OBJECT_STORAGE: "false"
    });
    assert.doesNotThrow(() => validateRuntimeConfiguration());
    process.env.MSG91_AUTHKEY = process.env.MSG91_AUTH_KEY;
    process.env.MSG91_INTEGRATED_NUMBER = process.env.MSG91_WHATSAPP_NUMBER;
    process.env.WHATSAPP_NAMESPACE = process.env.MSG91_WHATSAPP_NAMESPACE;
    process.env.WHATSAPP_TEMPLATE_NAME = process.env.MSG91_PAYMENT_LINK_TEMPLATE;
    delete process.env.MSG91_AUTH_KEY;
    delete process.env.MSG91_WHATSAPP_NUMBER;
    delete process.env.MSG91_WHATSAPP_NAMESPACE;
    delete process.env.MSG91_PAYMENT_LINK_TEMPLATE;
    assert.doesNotThrow(() => validateRuntimeConfiguration());
    process.env.MSG91_INVOICE_TEMPLATE = "wrong_template";
    assert.throws(() => validateRuntimeConfiguration(), /approved 'payment_invoice'/);
  } finally {
    for (const key of keys) original[key] === undefined ? delete process.env[key] : process.env[key] = original[key]!;
  }
});
