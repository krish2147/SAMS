import { formatBatchTime, formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import QRCode from "qrcode";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { ACADEMY_CONTACT } from "./MemberSupportPage";
// Underwater pool lanes, Unsplash photo 1669185694564 (Unsplash licence), cropped to card shape.
// Served from public/ so it is a plain URL (the unit tests run in Node, which cannot import images).
const poolPhotoUrl = "/images/card-pool.jpg";

// The member card is drawn once, as an SVG, and that same drawing is shown on screen and turned
// into the downloadable PNG, so the two can never drift apart.

export function membershipCardFilename(membershipNo?: string | null) {
  const reference = membershipNo?.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${reference || "membership"}-membership-card.png`;
}

export function memberQrPayload(membershipNo: string) {
  return JSON.stringify({ type: "BSF_MEMBER_PASS", membershipNo, v: 1 });
}

export const cardInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Font size that keeps `text` within `maxWidth` (approximate average glyph width). */
const fitSize = (text: string, maxWidth: number, max: number, min: number, glyph = 0.58) =>
  Math.max(min, Math.min(max, Math.floor(maxWidth / Math.max(1, text.length * glyph))));

export const CARD_WIDTH = 1586;
export const CARD_HEIGHT = 1000;

export interface CardImages {
  qr: string | null;
  photo: string | null;
  /** The pool photo behind the card, as a data URL so it also appears in the PNG. */
  pool?: string | null;
}

async function toDataUrl(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src, { credentials: "same-origin" })).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let poolDataUrl: Promise<string | null> | null = null;
const loadPoolPhoto = () => (poolDataUrl ??= toDataUrl(poolPhotoUrl));

/** Everything the card needs that has to be fetched or generated first, as data URLs. */
export async function prepareCardImages(data: MemberDashboardData): Promise<CardImages> {
  const qr = data.member.membershipNo
    ? await QRCode.toDataURL(memberQrPayload(data.member.membershipNo), {
        width: 480, margin: 0, color: { dark: "#141619", light: "#ffffff" }, errorCorrectionLevel: "H"
      }).catch(() => null)
    : null;
  let photo: string | null = null;
  const src = data.member.photoUrl;
  if (src) {
    if (src.startsWith("data:")) photo = src;
    else {
      // Inlined so the photo also appears when the drawing is turned into a PNG.
      try {
        const blob = await (await fetch(src, { credentials: "same-origin" })).blob();
        photo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { photo = null; }
    }
  }
  return { qr, photo, pool: await loadPoolPhoto() };
}

// ---------------------------------------------------------------------------------------------
// An ID-style member card, not a bank card: a navy pool-photo header with the academy crest, a
// white body with the member's photo and details, the entry QR, and an aqua footer. The back
// carries the pool rules and the academy's contact details.
// ---------------------------------------------------------------------------------------------

const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = "#0b1f3a";
const MUTED = "#5b6b82";
const AQUA = "#0891b2";
const HEADER_H = 250;
const FOOTER_Y = 912;

const statusPill = (status: string) => ({
  "Active": { fill: "#dcfce7", text: "#166534" },
  "Expiring Soon": { fill: "#fef3c7", text: "#92400e" },
  "Expired": { fill: "#fee2e2", text: "#991b1b" },
  "Pending": { fill: "#e0f2fe", text: "#075985" }
}[status] || { fill: "#e0f2fe", text: "#075985" });

function sharedDefs(prefix: string) {
  return `
    <clipPath id="${prefix}Clip"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="44"/></clipPath>
    <clipPath id="${prefix}Header"><rect width="${CARD_WIDTH}" height="${HEADER_H}"/></clipPath>
    <clipPath id="${prefix}Crest"><rect x="84" y="55" width="140" height="140" rx="30"/></clipPath>
    <filter id="${prefix}Lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000814" flood-opacity="0.45"/></filter>
    <linearGradient id="${prefix}Navy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b3b6f"/><stop offset="1" stop-color="#061a36"/>
    </linearGradient>
    <linearGradient id="${prefix}Veil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#04162f" stop-opacity="0.82"/><stop offset="1" stop-color="#04162f" stop-opacity="0.45"/>
    </linearGradient>
    <linearGradient id="${prefix}Aqua" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0e7490"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>`;
}

/** White card with the pool-photo header band and the aqua footer, shared by both sides. */
function cardFrame(prefix: string, pool: string | null | undefined, title: string, right = "") {
  return `
  <g clip-path="url(#${prefix}Clip)">
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#ffffff"/>
    <g clip-path="url(#${prefix}Header)">
      <rect width="${CARD_WIDTH}" height="${HEADER_H}" fill="url(#${prefix}Navy)"/>
      ${pool ? `<image href="${escapeXml(pool)}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" y="-260" preserveAspectRatio="xMidYMid slice"/>` : ""}
      <rect width="${CARD_WIDTH}" height="${HEADER_H}" fill="url(#${prefix}Veil)"/>
    </g>
    <rect y="${HEADER_H}" width="${CARD_WIDTH}" height="8" fill="url(#${prefix}Aqua)"/>
    <path d="M0 ${HEADER_H + 30} q 60 -14 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0" fill="none" stroke="${AQUA}" stroke-opacity="0.12" stroke-width="3"/>
    <rect y="${FOOTER_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT - FOOTER_Y}" fill="url(#${prefix}Aqua)"/>
  </g>
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="43" fill="none" stroke="#cbd5e1" stroke-width="2"/>

  <rect x="84" y="55" width="140" height="140" rx="30" fill="#0a3d7a" filter="url(#${prefix}Lift)"/>
  <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="84" y="55" width="140" height="140" preserveAspectRatio="xMidYMid slice" clip-path="url(#${prefix}Crest)"/>
  <text x="258" y="118" font-family="${FONT}" font-size="46" font-weight="800" letter-spacing="1" fill="#ffffff">Baroda Swim Front</text>
  <text x="260" y="166" font-family="${FONT}" font-size="24" font-weight="700" letter-spacing="7" fill="#67e8f9">${escapeXml(title)}</text>
  ${right}`;
}

const label = (x: number, y: number, text: string, anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="3" fill="${MUTED}">${text}</text>`;
const value = (x: number, y: number, text: string, maxWidth = 360, size = 32) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${fitSize(text, maxWidth, size, 22, 0.56)}" font-weight="700" fill="${INK}">${escapeXml(text)}</text>`;

export function buildMembershipCardSvg(data: MemberDashboardData, images?: CardImages): string {
  const name = data.member.fullName || "Member";
  const memberNo = data.member.membershipNo || "Pending";
  const status = getMembershipDisplayStatus(data.membership.status, data.membership.expiryDate, data.membership.daysRemaining);
  const pill = statusPill(status);
  const plan = data.membership.planName || "Plan not assigned";
  const batch = data.batch
    ? [formatBatchTime(data.batch.startTime), formatBatchTime(data.batch.endTime)].filter(Boolean).join(" – ") || data.batch.name
    : data.membership.batchName || "Not assigned yet";
  const from = formatMemberDate(data.membership.startDate) || "Pending";
  const till = formatMemberDate(data.membership.expiryDate) || "Pending";
  const pillW = Math.round(status.length * 15 + 70);

  const statusBadge = `
  <rect x="${1502 - pillW}" y="96" width="${pillW}" height="58" rx="29" fill="${pill.fill}"/>
  <circle cx="${1502 - pillW + 30}" cy="125" r="8" fill="${pill.text}"/>
  <text x="${1502 - pillW + 48}" y="134" font-family="${FONT}" font-size="25" font-weight="700" fill="${pill.text}">${escapeXml(status)}</text>`;

  const photo = images?.photo
    ? `<clipPath id="frontPhoto"><rect x="84" y="310" width="270" height="330" rx="24"/></clipPath>
       <image href="${escapeXml(images.photo)}" x="84" y="310" width="270" height="330" preserveAspectRatio="xMidYMid slice" clip-path="url(#frontPhoto)"/>`
    : `<rect x="84" y="310" width="270" height="330" rx="24" fill="#e0f2fe"/>
       <text x="219" y="505" text-anchor="middle" font-family="${FONT}" font-size="96" font-weight="700" fill="${AQUA}">${escapeXml(cardInitials(name))}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" role="img" aria-label="Baroda Swim Front membership card for ${escapeXml(name)}">
  <defs>${sharedDefs("front")}</defs>
  ${cardFrame("front", images?.pool, "MEMBERSHIP CARD", statusBadge)}

  ${photo}
  <rect x="84" y="310" width="270" height="330" rx="24" fill="none" stroke="${AQUA}" stroke-width="5"/>

  <text x="410" y="366" font-family="${FONT}" font-size="${fitSize(name, 680, 56, 34, 0.56)}" font-weight="800" fill="${INK}">${escapeXml(name)}</text>
  <text x="412" y="414" font-family="${FONT}" font-size="${fitSize(plan, 680, 28, 20, 0.52)}" font-weight="600" fill="${AQUA}">${escapeXml(plan)}</text>

  ${label(412, 490, "MEMBER NO.")}${value(412, 532, memberNo)}
  ${label(780, 490, "POOL TIME")}${value(780, 532, batch, 330)}
  ${label(412, 600, "VALID FROM")}${value(412, 642, from)}
  ${label(780, 600, "VALID TILL")}${value(780, 642, till, 330)}

  ${images?.qr ? `<rect x="1178" y="300" width="324" height="324" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <image href="${escapeXml(images.qr)}" x="1200" y="322" width="280" height="280"/>
  ${label(1340, 666, "SCAN AT RECEPTION", "middle")}` : ""}

  <line x1="84" y1="780" x2="1502" y2="780" stroke="#e2e8f0" stroke-width="2"/>
  <text x="84" y="846" font-family="${FONT}" font-size="24" fill="${MUTED}">Show this card at reception on every visit. Valid only for the member named above.</text>

  <text x="84" y="967" font-family="${FONT}" font-size="26" font-weight="700" letter-spacing="4" fill="#ffffff">SWIM FOR LIFE · VADODARA</text>
  <text x="1502" y="967" text-anchor="end" font-family="${FONT}" font-size="24" font-weight="600" fill="#ecfeff">${escapeXml(ACADEMY_CONTACT.phoneDisplay)}</text>
</svg>`;
}

const CARD_RULES = [
  "Show this card at reception before entering the pool.",
  "Swimwear and a silicone swim cap are compulsory.",
  "Shower before entering the water.",
  "Follow the instructions of the coach and lifeguard.",
  "This card is personal and cannot be transferred."
];

/** Back of the card: pool rules and how to reach the academy. */
export function buildMembershipCardBackSvg(data: MemberDashboardData, images: CardImages): string {
  const memberNo = data.member.membershipNo || "Pending";
  const rules = CARD_RULES.map((rule, i) => `
    <circle cx="100" cy="${384 + i * 62}" r="7" fill="${AQUA}"/>
    <text x="124" y="${393 + i * 62}" font-family="${FONT}" font-size="27" fill="${INK}">${escapeXml(rule)}</text>`).join("");
  const addressLines = ["Aark International School,", "Vasna–Bhayli Main Rd,", "Vadodara, Gujarat 391101"];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" role="img" aria-label="Back of the membership card">
  <defs>${sharedDefs("back")}</defs>
  ${cardFrame("back", images.pool, "MEMBER INFORMATION", `<text x="1502" y="134" text-anchor="end" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff">${escapeXml(memberNo)}</text>`)}

  ${label(84, 334, "POOL RULES")}
  ${rules}

  <line x1="1060" y1="310" x2="1060" y2="840" stroke="#e2e8f0" stroke-width="2"/>
  ${label(1110, 334, "CONTACT")}
  <text x="1110" y="384" font-family="${FONT}" font-size="30" font-weight="700" fill="${INK}">${escapeXml(ACADEMY_CONTACT.phoneDisplay)}</text>
  ${addressLines.map((line, i) => `<text x="1110" y="${440 + i * 38}" font-family="${FONT}" font-size="24" fill="${MUTED}">${escapeXml(line)}</text>`).join("")}
  ${label(1110, 616, "HOURS")}
  <text x="1110" y="660" font-family="${FONT}" font-size="24" fill="${INK}">Mon–Sat · 6–9 AM, 4–8 PM</text>
  <text x="1110" y="698" font-family="${FONT}" font-size="24" fill="${MUTED}">Closed on Sunday</text>

  <text x="84" y="967" font-family="${FONT}" font-size="22" font-weight="600" fill="#ffffff">If found, please return this card to Baroda Swim Front, Vadodara.</text>
</svg>`;
}

async function svgToImage(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Card image could not be drawn"));
      img.src = url;
    });
  } finally {
    // Revoked after decode; the decoded image stays usable for drawing.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Saves both sides, front above back, on a soft studio background. */
export async function downloadMembershipCardPng(data: MemberDashboardData) {
  const images = await prepareCardImages(data);
  const [front, back] = await Promise.all([
    svgToImage(buildMembershipCardSvg(data, images)),
    svgToImage(buildMembershipCardBackSvg(data, images))
  ]);
  const M = 80, GAP = 70;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH + M * 2;
  canvas.height = CARD_HEIGHT * 2 + GAP + M * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#f4f1ea");
  bg.addColorStop(1, "#e6e1d6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [img, y] of [[front, M], [back, M + CARD_HEIGHT + GAP]] as const) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.drawImage(img, M, y, CARD_WIDTH, CARD_HEIGHT);
    ctx.restore();
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Membership card export failed");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = membershipCardFilename(data.member.membershipNo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
