import axios, { AxiosResponse } from "axios";
import fs from "fs";

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
 * Sends the "payment_success" WhatsApp template once a membership is activated.
 * Confirmed live against MSG91's approved template body (Manage Templates -> payment_success):
 * {{1}} name, {{2}} amount paid, {{3}} membership number, {{4}} receipt number,
 * {{5}} start date, {{6}} end date.
 */
export async function sendPaymentSuccessWhatsApp(params: {
  phoneNumber: string;
  memberName: string;
  amount: string | number;
  membershipNo: string;
  receiptNo: string;
  startDate: string;
  endDate: string;
}): Promise<Msg91WhatsAppResponse> {
  const templateName = process.env.MSG91_PAYMENT_SUCCESS_TEMPLATE || "payment_success";
  return sendMsg91Template(params.phoneNumber, templateName, {
    body_1: { type: "text", value: String(params.memberName).trim() },
    body_2: { type: "text", value: String(params.amount || "0") },
    body_3: { type: "text", value: String(params.membershipNo || "").trim() },
    body_4: { type: "text", value: String(params.receiptNo || "").trim() },
    body_5: { type: "text", value: String(params.startDate || "").trim() },
    body_6: { type: "text", value: String(params.endDate || "").trim() }
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
  startDate: string;
  endDate: string;
  pdfBuffer?: Buffer;
  pdfFilePath?: string;
}): Promise<Msg91WhatsAppResponse> {
  const templateName = process.env.MSG91_INVOICE_TEMPLATE || "payment_invoice";
  const fileBuffer = params.pdfBuffer || (params.pdfFilePath ? fs.readFileSync(params.pdfFilePath) : null);
  if (!fileBuffer) {
    throw new Error("sendPaymentInvoiceWhatsApp requires either pdfBuffer or pdfFilePath.");
  }
  const dataUri = `data:application/pdf;base64,${fileBuffer.toString("base64")}`;

  return sendMsg91Template(params.phoneNumber, templateName, {
    header_1: { type: "document", value: dataUri, filename: `${params.invoiceNo || "invoice"}.pdf` },
    body_1: { type: "text", value: String(params.memberName).trim() },
    body_2: { type: "text", value: String(params.invoiceNo || "").trim() },
    body_3: { type: "text", value: String(params.amount || "0") },
    body_4: { type: "text", value: String(params.startDate || "").trim() },
    body_5: { type: "text", value: String(params.endDate || "").trim() }
  });
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
  const formattedAmount = String(amount || "0");

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
