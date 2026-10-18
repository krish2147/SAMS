// WhatsApp through Meta's own Cloud API (no reseller in between).
// Turned on with WHATSAPP_PROVIDER=meta plus:
//   WHATSAPP_API_TOKEN        permanent System User token from Meta Business Settings
//   WHATSAPP_PHONE_NUMBER_ID  the "Phone number ID" shown in WhatsApp Manager / API Setup
//   WHATSAPP_TEMPLATE_LANGUAGE  language code of the approved templates (default "en")
const GRAPH = "https://graph.facebook.com/v21.0";

export function isMetaWhatsAppEnabled(): boolean {
  return (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase() === "meta";
}

function metaConfig() {
  const token = (process.env.WHATSAPP_API_TOKEN || "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set to send WhatsApp through Meta.");
  }
  return { token, phoneNumberId, language: (process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en").trim() };
}

async function graphError(res: Response): Promise<Error> {
  const body: any = await res.json().catch(() => ({}));
  const e = body?.error || {};
  const detail = [e.message, e.error_data?.details].filter(Boolean).join(" - ");
  return new Error(`Meta WhatsApp error${e.code ? ` ${e.code}` : ""}: ${detail || res.statusText}`);
}

// Documents are uploaded to Meta first; the template then refers to the upload by id.
async function uploadDocument(buffer: Buffer, filename: string): Promise<string> {
  const { token, phoneNumberId } = metaConfig();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);
  const res = await fetch(`${GRAPH}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw await graphError(res);
  const data: any = await res.json();
  return data.id;
}

export async function sendMetaTemplate(
  to: string,
  templateName: string,
  bodyValues: string[],
  document?: { buffer: Buffer; filename: string }
): Promise<{ status: string; messageId?: string; data: any }> {
  const { token, phoneNumberId, language } = metaConfig();
  const components: any[] = [];
  if (document) {
    const mediaId = await uploadDocument(document.buffer, document.filename);
    components.push({ type: "header", parameters: [{ type: "document", document: { id: mediaId, filename: document.filename } }] });
  }
  if (bodyValues.length) {
    components.push({ type: "body", parameters: bodyValues.map((text) => ({ type: "text", text: String(text ?? "").trim() || "-" })) });
  }

  console.log("[WHATSAPP-DEBUG] Meta request sent", { to, template: templateName });
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: templateName, language: { code: language }, components },
    }),
  });
  if (!res.ok) {
    const err = await graphError(res);
    console.error("[WHATSAPP-DEBUG] Meta error:", err.message);
    throw err;
  }
  const data: any = await res.json();
  const messageId = data?.messages?.[0]?.id;
  console.log("[WHATSAPP-DEBUG] Meta accepted", { template: templateName, messageId });
  return { status: "success", messageId, data };
}
