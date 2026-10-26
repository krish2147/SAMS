import axios, { AxiosResponse } from "axios";
import fs from "fs";
import { isMetaWhatsAppEnabled, sendMetaTemplate } from "./meta-whatsapp.service";
import { formatDateOnlyForWhatsApp } from "../utils/membership-date";

// Template values read like the message text: dates as 19/10/2026 (database DATE values otherwise
// print as "Mon Oct 19 2026 00:00:00 GMT…"), amounts as 9,800 or 9,800.50.
function waDate(value: unknown): string {
  if (!value) return "-";
  try { return formatDateOnlyForWhatsApp(value as any); } catch { return String(value); }
}
function waAmount(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value || "0");
  return n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

/**
 * Interface representing the MSG91 WhatsApp Outbound Request Payload
 */
export interface Msg91WhatsAppRequestBody {
  integrated_number: string;
  content_type: "template";
  payload: {
    to?: string;
    type: "template";
    template: {
      name: string;
      language: {
        code: string;
        policy: string;
      };
      namespace: string;
      to_and_components: Array<{
        to: string[];
        components: {
          body_1: {
            type: "text";
            value: string;
          };
          body_2: {
            type: "text";
            value: string;
          };
          body_3: {
            type: "text";
            value: string;
          };
          body_4: {
            type: "text";
            value: string;
          };
          [key: string]: {
            type: string;
            value: string;
          };
        };
      }>;
    };
  };
}

/**
 * Interface for API response from MSG91
 */
export interface Msg91WhatsAppResponse {
  status?: string;
  message?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Helper to normalize and sanitize recipient mobile number
 * Formats to 91XXXXXXXXXX without '+' or leading zeros
 */
function normalizePhoneNumber(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, "");
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    return digitsOnly;
  }
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
}

function resolveMsg91Config() {
  const authKey = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY || "";
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || process.env.MSG91_WHATSAPP_NUMBER || "";
  const namespace = process.env.WHATSAPP_NAMESPACE || process.env.MSG91_WHATSAPP_NAMESPACE || "";
  return { authKey, integratedNumber, namespace };
}

async function sendMsg91Template(
  phoneNumber: string,
  templateName: string,
  components: Record<string, { type: string; value: string; filename?: string }>
): Promise<Msg91WhatsAppResponse> {
  const { authKey, integratedNumber, namespace } = resolveMsg91Config();
  if (!authKey || !integratedNumber || !namespace) {
    const errorMsg = "MSG91_AUTHKEY, MSG91_INTEGRATED_NUMBER, and WHATSAPP_NAMESPACE must be configured.";
    console.error(`[WhatsApp Service Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const formattedToNumber = normalizePhoneNumber(phoneNumber);

  const requestBody = {
    integrated_number: integratedNumber,
    content_type: "template",
    payload: {
      type: "template",
      template: {
        name: templateName,
        language: { code: "en", policy: "deterministic" },
        namespace,
        to_and_components: [{ to: [formattedToNumber], components }]
      }
    }
  };

  try {
    console.log("[WHATSAPP-DEBUG] MSG91 request sent", { to: formattedToNumber, template: templateName });
    const response: AxiosResponse<Msg91WhatsAppResponse> = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      requestBody,
      { headers: { authkey: authKey, "Content-Type": "application/json" }, timeout: 30000 }
    );
    console.log("[WHATSAPP-DEBUG] MSG91 response received", { status: response.status, template: templateName });
    return response.data;
  } catch (error: any) {
    console.error(`[WHATSAPP-DEBUG] MSG91 error (${templateName}):`, error.response?.data || error.message || error);
    throw error;
  }
}

/**
 * Sends the "payment_success_message" WhatsApp template once a membership is activated: only that
 * the payment went through, the membership's valid period, and that the member portal is open.
 * The template is in docs/msg91/payment_success.json. Body variables: {{1}} name,
 * {{2}} start date, {{3}} end date.
 * (Amount, membership and invoice numbers are in the invoice message that follows.)
 */
export async function sendPaymentSuccessWhatsApp(params: {
  phoneNumber: string;
  memberName: string;
  amount?: string | number;
  membershipNo?: string;
  invoiceNo?: string;
  startDate: string | Date;
  endDate: string | Date;
}): Promise<Msg91WhatsAppResponse> {
  const templateName = process.env.MSG91_PAYMENT_SUCCESS_TEMPLATE || "payment_success_message";
  const values = [String(params.memberName || "").trim() || "Member", waDate(params.startDate), waDate(params.endDate)];
  if (isMetaWhatsAppEnabled()) {
    return sendMetaTemplate(normalizePhoneNumber(params.phoneNumber), templateName, values);
  }
  return sendMsg91Template(params.phoneNumber, templateName, {
    body_1: { type: "text", value: values[0] },
    body_2: { type: "text", value: values[1] },
    body_3: { type: "text", value: values[2] }
  });
}

/**
 * Sends the "payment_invoice" WhatsApp template with the invoice PDF as a document header.
 * Confirmed live against MSG91's approved template body (Manage Templates -> payment_invoice):
 * {{1}} name, {{2}} invoice number, {{3}} amount paid, {{4}} start date, {{5}} end date.
 *
 * The document header is sent as a base64 data URI, not a URL -- MSG91 accepts the file content
 * directly and does not require it to be fetchable from a public address. This matters because
 * this deployment has no object storage configured, so the generated PDF only ever exists on
 * local disk; a URL-based header would need MSG91/Meta to fetch it over the internet, which a
 * localhost URL can never satisfy (confirmed empirically: MSG91 accepts the API call either way,
 * but only the base64 form actually delivers the attachment).
 */
export async function sendPaymentInvoiceWhatsApp(params: {
  phoneNumber: string;
  memberName: string;
  invoiceNo: string;
  amount: string | number;
  startDate: string | Date;
  endDate: string | Date;
  pdfBuffer?: Buffer;
  pdfFilePath?: string;
}): Promise<Msg91WhatsAppResponse> {
  const templateName = process.env.MSG91_INVOICE_TEMPLATE || "payment_invoice";
  const fileBuffer = params.pdfBuffer || (params.pdfFilePath ? fs.readFileSync(params.pdfFilePath) : null);
  if (!fileBuffer) {
    throw new Error("sendPaymentInvoiceWhatsApp requires either pdfBuffer or pdfFilePath.");
  }
  if (isMetaWhatsAppEnabled()) {
    return sendMetaTemplate(
      normalizePhoneNumber(params.phoneNumber),
      templateName,
      [params.memberName, params.invoiceNo, waAmount(params.amount), waDate(params.startDate), waDate(params.endDate)],
      { buffer: fileBuffer, filename: `${params.invoiceNo || "invoice"}.pdf` }
    );
  }
  const dataUri = `data:application/pdf;base64,${fileBuffer.toString("base64")}`;

  return sendMsg91Template(params.phoneNumber, templateName, {
    header_1: { type: "document", value: dataUri, filename: `${params.invoiceNo || "invoice"}.pdf` },
    body_1: { type: "text", value: String(params.memberName).trim() },
    body_2: { type: "text", value: String(params.invoiceNo || "").trim() },
    body_3: { type: "text", value: waAmount(params.amount) },
    body_4: { type: "text", value: waDate(params.startDate) },
    body_5: { type: "text", value: waDate(params.endDate) }
  });
}

/**
 * Sends the "renewal_reminder" WhatsApp template 3 days before, and on the last day of, a
 * membership. The template is in docs/msg91/renewal_reminder.json (import it in MSG91 under
 * WhatsApp -> Templates -> Import). Body variables:
 * {{1}} name, {{2}} membership number, {{3}} "in 3 days" / "tomorrow" / "today",
 * {{4}} end date, {{5}} batch.
 */
export async function sendRenewalReminderWhatsApp(params: {
  phoneNumber: string;
  memberName: string;
  membershipNo: string;
  endsText: string;
  endDate: string;
  batch: string;
}): Promise<Msg91WhatsAppResponse> {
  const templateName = process.env.MSG91_RENEWAL_TEMPLATE || "renewal_reminder";
  const values = [params.memberName, params.membershipNo, params.endsText, params.endDate, params.batch].map((v) => String(v || "").trim() || "-");
  if (isMetaWhatsAppEnabled()) {
    return sendMetaTemplate(normalizePhoneNumber(params.phoneNumber), templateName, values);
  }
  return sendMsg91Template(params.phoneNumber, templateName, Object.fromEntries(
    values.map((value, i) => [`body_${i + 1}`, { type: "text", value }])
  ));
}

/**
 * Sends an automated WhatsApp Payment Reminder message via MSG91 WhatsApp Outbound API
 *
 * The approved "payment_link" template has 4 body variables, confirmed against the
 * live template text in MSG91 (Manage Templates -> payment_link): {{1}} name greeting,
 * {{2}} membership number, {{3}} amount, {{4}} payment link. Sending only 3 params
 * fails outbound delivery with "number of localizable_params (3) does not match the
 * expected number of params (4)".
 *
 * @param phoneNumber - Recipient mobile number (e.g., '9876543210' or '919876543210')
 * @param customerName - Member / Customer Full Name (Template variable body_1)
 * @param membershipNo - Member's membership number (Template variable body_2)
 * @param amount - Pending membership amount (Template variable body_3)
 * @param paymentLink - Razorpay payment gateway URL (Template variable body_4)
 * @returns MSG91 API Response
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  customerName: string,
  membershipNo: string,
  amount: string | number,
  paymentLink: string
): Promise<Msg91WhatsAppResponse> {
  if (isMetaWhatsAppEnabled()) {
    if (!phoneNumber || !customerName || !paymentLink) {
      throw new Error("Missing required parameters for WhatsApp payment reminder.");
    }
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || process.env.MSG91_PAYMENT_LINK_TEMPLATE || "payment_link";
    return sendMetaTemplate(normalizePhoneNumber(phoneNumber), templateName, [
      customerName, membershipNo, waAmount(amount), paymentLink
    ]);
  }

  // Accept both .env.example's naming (MSG91_AUTHKEY/MSG91_INTEGRATED_NUMBER/WHATSAPP_NAMESPACE)
  // and the MSG91_-prefixed variants that ended up in this deployment's real .env.
  const authKey = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY || "";
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || process.env.MSG91_WHATSAPP_NUMBER || "";
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || process.env.MSG91_PAYMENT_LINK_TEMPLATE || "payment_link";
  const namespace = process.env.WHATSAPP_NAMESPACE || process.env.MSG91_WHATSAPP_NAMESPACE || "";

  if (!authKey || !integratedNumber || !namespace) {
    const errorMsg = "MSG91_AUTHKEY, MSG91_INTEGRATED_NUMBER, and WHATSAPP_NAMESPACE must be configured.";
    console.error(`[WhatsApp Service Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (!phoneNumber || !customerName || !paymentLink) {
    const errorMsg = "Missing required parameters for WhatsApp payment reminder.";
    console.error(`[WhatsApp Service Error] ${errorMsg}`, { phoneNumber, customerName, amount, paymentLink });
    throw new Error(errorMsg);
  }

  const formattedToNumber = normalizePhoneNumber(phoneNumber);
  const formattedAmount = waAmount(amount);

  console.log("[WHATSAPP-DEBUG] Payment link received", { to: formattedToNumber, amount: formattedAmount });
  console.log("[WHATSAPP-DEBUG] Mobile number normalized", { original: phoneNumber, normalized: formattedToNumber });

  const requestBody: Msg91WhatsAppRequestBody = {
    integrated_number: integratedNumber,
    content_type: "template",
    payload: {
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en",
          policy: "deterministic"
        },
        namespace: namespace,
        to_and_components: [
          {
            to: [formattedToNumber],
            components: {
              body_1: {
                type: "text",
                value: String(customerName).trim()
              },
              body_2: {
                type: "text",
                value: String(membershipNo || "").trim()
              },
              body_3: {
                type: "text",
                value: formattedAmount
              },
              body_4: {
                type: "text",
                value: String(paymentLink).trim()
              }
            }
          }
        ]
      }
    }
  };

  try {
    console.log("[WHATSAPP-DEBUG] MSG91 request sent", { to: formattedToNumber, template: templateName });
    const response: AxiosResponse<Msg91WhatsAppResponse> = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      requestBody,
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );
    console.log("[WHATSAPP-DEBUG] MSG91 response received", { status: response.status });
    console.log("[WHATSAPP-DEBUG] WhatsApp completed");
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message || error;
    console.error("[WHATSAPP-DEBUG] MSG91 error:", errorDetails);
    throw error;
  }
}
