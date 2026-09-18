import axios, { AxiosResponse } from "axios";

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

/**
 * Sends an automated WhatsApp Payment Reminder message via MSG91 WhatsApp Outbound API
 *
 * @param phoneNumber - Recipient mobile number (e.g., '9876543210' or '919876543210')
 * @param customerName - Member / Customer Full Name (Template variable body_1)
 * @param amount - Pending membership amount (Template variable body_2)
 * @param paymentLink - Razorpay payment gateway URL (Template variable body_3)
 * @returns MSG91 API Response
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  customerName: string,
  amount: string | number,
  paymentLink: string
): Promise<Msg91WhatsAppResponse> {
  const authKey = process.env.MSG91_AUTHKEY || "";
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || "";
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "payment_link";
  const namespace = process.env.WHATSAPP_NAMESPACE || "";

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
                value: formattedAmount
              },
              body_3: {
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
