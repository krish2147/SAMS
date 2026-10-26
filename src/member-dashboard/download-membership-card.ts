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

// Portrait, like an ID badge (standard card proportions, turned upright).
export const CARD_WIDTH = 1000;
export const CARD_HEIGHT = 1586;

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
// An upright, ID-badge style member card: a navy pool-photo header with the academy crest, the
// member's photo overlapping it, then name, details and the entry QR on white, and an aqua
// footer. The back carries the pool rules and the academy's contact details.
// ---------------------------------------------------------------------------------------------

const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = "#0b1f3a";
const MUTED = "#5b6b82";
const AQUA = "#0891b2";
const W = CARD_WIDTH;
const CX = CARD_WIDTH / 2;
const FOOTER_Y = 1490;

const statusPill = (status: string) => ({
  "Active": { fill: "#dcfce7", text: "#166534" },
  "Expiring Soon": { fill: "#fef3c7", text: "#92400e" },
  "Expired": { fill: "#fee2e2", text: "#991b1b" },
  "Pending": { fill: "#e0f2fe", text: "#075985" }
}[status] || { fill: "#e0f2fe", text: "#075985" });

function sharedDefs(prefix: string, headerH: number) {
  return `
    <clipPath id="${prefix}Clip"><rect width="${W}" height="${CARD_HEIGHT}" rx="44"/></clipPath>
    <clipPath id="${prefix}Header"><rect width="${W}" height="${headerH}"/></clipPath>
    <filter id="${prefix}Lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000814" flood-opacity="0.4"/></filter>
    <linearGradient id="${prefix}Navy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b3b6f"/><stop offset="1" stop-color="#061a36"/>
    </linearGradient>
    <linearGradient id="${prefix}Veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#04162f" stop-opacity="0.5"/><stop offset="1" stop-color="#04162f" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="${prefix}Aqua" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0e7490"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>`;
}

/** White card with a pool-photo header band and an aqua footer, shared by both sides. */
function cardFrame(prefix: string, pool: string | null | undefined, headerH: number) {
  return `
  <g clip-path="url(#${prefix}Clip)">
    <rect width="${W}" height="${CARD_HEIGHT}" fill="#ffffff"/>
    <g clip-path="url(#${prefix}Header)">
      <rect width="${W}" height="${headerH}" fill="url(#${prefix}Navy)"/>
      ${pool ? `<image href="${escapeXml(pool)}" x="-300" width="1600" height="1000" preserveAspectRatio="xMidYMid slice"/>` : ""}
      <rect width="${W}" height="${headerH}" fill="url(#${prefix}Veil)"/>
    </g>
    <rect y="${headerH}" width="${W}" height="8" fill="url(#${prefix}Aqua)"/>
    <rect y="${FOOTER_Y}" width="${W}" height="${CARD_HEIGHT - FOOTER_Y}" fill="url(#${prefix}Aqua)"/>
  </g>
  <rect x="1" y="1" width="${W - 2}" height="${CARD_HEIGHT - 2}" rx="43" fill="none" stroke="#cbd5e1" stroke-width="2"/>`;
}

const crest = (x: number, y: number, size: number, prefix: string) => `
  <clipPath id="${prefix}Crest"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.22}"/></clipPath>
  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.22}" fill="#0a3d7a" filter="url(#${prefix}Lift)"/>
  <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${prefix}Crest)"/>`;

const label = (x: number, y: number, text: string, anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="21" font-weight="700" letter-spacing="3" fill="${MUTED}">${text}</text>`;
const value = (x: number, y: number, text: string, maxWidth = 380, size = 34) =>
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
  const HEADER = 400;
  const pillW = Math.round(status.length * 15 + 72);
  const PX = CX - 140, PY = 300, PW = 280, PH = 340;

  const photo = images?.photo
    ? `<clipPath id="frontPhoto"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="26"/></clipPath>
       <image href="${escapeXml(images.photo)}" x="${PX}" y="${PY}" width="${PW}" height="${PH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#frontPhoto)"/>`
    : `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="26" fill="#e0f2fe"/>
       <text x="${CX}" y="${PY + PH / 2 + 34}" text-anchor="middle" font-family="${FONT}" font-size="100" font-weight="700" fill="${AQUA}">${escapeXml(cardInitials(name))}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${CARD_HEIGHT}" width="${W}" height="${CARD_HEIGHT}" role="img" aria-label="Baroda Swim Front membership card for ${escapeXml(name)}">
  <defs>${sharedDefs("front", HEADER)}</defs>
  ${cardFrame("front", images?.pool, HEADER)}

  ${crest(70, 60, 120, "front")}
  <text x="214" y="118" font-family="${FONT}" font-size="44" font-weight="800" fill="#ffffff">Baroda Swim Front</text>
  <text x="216" y="164" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="7" fill="#67e8f9">MEMBERSHIP CARD</text>

  <rect x="${PX - 10}" y="${PY - 10}" width="${PW + 20}" height="${PH + 20}" rx="34" fill="#ffffff" filter="url(#frontLift)"/>
  ${photo}

  <text x="${CX}" y="728" text-anchor="middle" font-family="${FONT}" font-size="${fitSize(name, 860, 62, 36, 0.56)}" font-weight="800" fill="${INK}">${escapeXml(name)}</text>
  <text x="${CX}" y="778" text-anchor="middle" font-family="${FONT}" font-size="${fitSize(plan, 860, 30, 20, 0.52)}" font-weight="600" fill="${AQUA}">${escapeXml(plan)}</text>
  <rect x="${CX - pillW / 2}" y="806" width="${pillW}" height="54" rx="27" fill="${pill.fill}"/>
  <circle cx="${CX - pillW / 2 + 30}" cy="833" r="8" fill="${pill.text}"/>
  <text x="${CX - pillW / 2 + 48}" y="842" font-family="${FONT}" font-size="25" font-weight="700" fill="${pill.text}">${escapeXml(status)}</text>

  <line x1="80" y1="900" x2="${W - 80}" y2="900" stroke="#e2e8f0" stroke-width="2"/>
  ${label(90, 950, "MEMBER NO.")}${value(90, 994, memberNo)}
  ${label(530, 950, "POOL TIME")}${value(530, 994, batch, 390)}
  ${label(90, 1052, "VALID FROM")}${value(90, 1096, from)}
  ${label(530, 1052, "VALID TILL")}${value(530, 1096, till, 390)}

  ${images?.qr ? `<rect x="${CX - 150}" y="1140" width="300" height="300" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <image href="${escapeXml(images.qr)}" x="${CX - 128}" y="1162" width="256" height="256"/>
  ${label(CX, 1470, "SCAN AT RECEPTION", "middle")}` : ""}

  <text x="${CX}" y="1550" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="700" letter-spacing="4" fill="#ffffff">SWIM FOR LIFE · VADODARA</text>
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
  const HEADER = 260;
  const rules = CARD_RULES.map((rule, i) => `
    <circle cx="96" cy="${410 + i * 68}" r="7" fill="${AQUA}"/>
    <text x="122" y="${419 + i * 68}" font-family="${FONT}" font-size="${fitSize(rule, 800, 29, 22, 0.5)}" fill="${INK}">${escapeXml(rule)}</text>`).join("");
  const addressLines = ["Aark International School,", "Vasna–Bhayli Main Rd, Vadodara, Gujarat 391101"];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${CARD_HEIGHT}" width="${W}" height="${CARD_HEIGHT}" role="img" aria-label="Back of the membership card">
  <defs>${sharedDefs("back", HEADER)}</defs>
  ${cardFrame("back", images.pool, HEADER)}

  ${crest(70, 60, 120, "back")}
  <text x="214" y="118" font-family="${FONT}" font-size="44" font-weight="800" fill="#ffffff">Baroda Swim Front</text>
  <text x="216" y="164" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="7" fill="#67e8f9">MEMBER INFORMATION</text>
  <text x="216" y="214" font-family="${FONT}" font-size="28" font-weight="600" fill="#ffffff" fill-opacity="0.85">${escapeXml(memberNo)}</text>

  ${label(80, 350, "POOL RULES")}
  ${rules}

  <line x1="80" y1="780" x2="${W - 80}" y2="780" stroke="#e2e8f0" stroke-width="2"/>
  ${label(80, 846, "CONTACT")}
  <text x="80" y="900" font-family="${FONT}" font-size="40" font-weight="800" fill="${INK}">${escapeXml(ACADEMY_CONTACT.phoneDisplay)}</text>
  ${addressLines.map((line, i) => `<text x="80" y="${956 + i * 40}" font-family="${FONT}" font-size="27" fill="${MUTED}">${escapeXml(line)}</text>`).join("")}

  ${label(80, 1110, "HOURS")}
  <text x="80" y="1160" font-family="${FONT}" font-size="30" font-weight="600" fill="${INK}">Monday to Saturday</text>
  <text x="80" y="1204" font-family="${FONT}" font-size="28" fill="${MUTED}">6 – 9 AM and 4 – 8 PM · Closed on Sunday</text>

  <text x="${CX}" y="1380" text-anchor="middle" font-family="${FONT}" font-size="25" fill="${MUTED}">If found, please return this card to</text>
  <text x="${CX}" y="1418" text-anchor="middle" font-family="${FONT}" font-size="25" font-weight="700" fill="${INK}">Baroda Swim Front, Vadodara.</text>

  <text x="${CX}" y="1550" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="700" letter-spacing="4" fill="#ffffff">SWIM FOR LIFE · VADODARA</text>
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

/** Saves both sides, front beside back, on a soft studio background. */
export async function downloadMembershipCardPng(data: MemberDashboardData) {
  const images = await prepareCardImages(data);
  const [front, back] = await Promise.all([
    svgToImage(buildMembershipCardSvg(data, images)),
    svgToImage(buildMembershipCardBackSvg(data, images))
  ]);
  const M = 80, GAP = 70;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * 2 + GAP + M * 2;
  canvas.height = CARD_HEIGHT + M * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#f4f1ea");
  bg.addColorStop(1, "#e6e1d6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [img, x] of [[front, M], [back, M + CARD_WIDTH + GAP]] as const) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.drawImage(img, x, M, CARD_WIDTH, CARD_HEIGHT);
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
