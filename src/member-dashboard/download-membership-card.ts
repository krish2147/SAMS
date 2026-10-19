import { formatBatchTime, formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import QRCode from "qrcode";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
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

const statusColor = (status: string) =>
  status === "Expiring Soon" ? "#fbbf24" : status === "Expired" ? "#94a3b8" : status === "Pending" ? "#7dd3fc" : "#4ade80";

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
// A real pool photo (underwater lanes) under premium card details: the academy crest in full
// colour, a gold chip and engraved lettering. The front stays minimal like a premium bank card;
// the back carries the photo, details and QR over a darker veil of the same pool.
// ---------------------------------------------------------------------------------------------

const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

/** "BSF-2026-8339" -> "BSF  2026  8339", spaced like the digits on a bank card. */
const cardNumber = (membershipNo: string) => membershipNo.split(/[-\s]+/).filter(Boolean).join("  ");

/** "2027-01-18" -> "01/27". */
const validThru = (value?: string | null) => {
  const m = String(value || "").match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}/${m[1].slice(2)}` : "--/--";
};

/** Shared defs: pool-blue fallback, readability shades, champagne gold and the engraving filter. */
function sharedDefs(prefix: string) {
  return `
    <clipPath id="${prefix}Clip"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="58"/></clipPath>
    <clipPath id="${prefix}Crest"><rect x="100" y="82" width="140" height="140" rx="32"/></clipPath>
    <filter id="crestShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000814" flood-opacity="0.55"/></filter>
    <clipPath id="${prefix}CrestSmall"><rect x="1418" y="852" width="64" height="64" rx="16"/></clipPath>
    <linearGradient id="graphite" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1468a8"/>
      <stop offset="0.5" stop-color="#0a4a86"/>
      <stop offset="1" stop-color="#052a55"/>
    </linearGradient>
    <radialGradient id="falloff" cx="0.18" cy="0.12" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.02"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.35"/>
    </radialGradient>
    <linearGradient id="champagne" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6e7bf"/>
      <stop offset="0.3" stop-color="#d9bd7c"/>
      <stop offset="0.55" stop-color="#a8843f"/>
      <stop offset="0.8" stop-color="#e8d29a"/>
      <stop offset="1" stop-color="#b8954d"/>
    </linearGradient>
    <linearGradient id="edgeLight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.18"/>
    </linearGradient>
    <linearGradient id="shadeLeft" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#021a3a" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#021a3a" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#021a3a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shadeBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.6" stop-color="#010e22" stop-opacity="0"/>
      <stop offset="1" stop-color="#010e22" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="shadeTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#010e22" stop-opacity="0.3"/>
      <stop offset="0.3" stop-color="#010e22" stop-opacity="0"/>
    </linearGradient>
    <filter id="engrave" x="-5%" y="-30%" width="110%" height="160%">
      <feDropShadow dx="0" dy="-1.5" stdDeviation="0.4" flood-color="#ffffff" flood-opacity="0.35"/>
      <feDropShadow dx="0" dy="2.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.85"/>
    </filter>`;
}

function cardBody(prefix: string, pool: string | null | undefined, extra = "", veil = 0) {
  return `
  <g clip-path="url(#${prefix}Clip)">
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#graphite)"/>
    ${pool ? `<image href="${escapeXml(pool)}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>` : ""}
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shadeTop)"/>
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shadeLeft)"/>
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shadeBottom)"/>
    ${veil ? `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#021531" fill-opacity="${veil}"/>` : ""}
    ${extra}
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#falloff)" opacity="0.35"/>
  </g>
  <rect x="1.5" y="1.5" width="${CARD_WIDTH - 3}" height="${CARD_HEIGHT - 3}" rx="57" fill="none" stroke="url(#edgeLight)" stroke-width="3"/>`;
}

export function buildMembershipCardSvg(data: MemberDashboardData, images?: CardImages): string {
  const name = (data.member.fullName || "Member").toUpperCase();
  const number = data.member.membershipNo ? cardNumber(data.member.membershipNo) : "PENDING";
  const status = getMembershipDisplayStatus(data.membership.status, data.membership.expiryDate, data.membership.daysRemaining);
  const plan = (data.membership.planName || "").replace(/\s*-\s*/g, " · ").toUpperCase();
  const nameSize = fitSize(name, 1000, 44, 30, 0.72);
  const numberSize = fitSize(number, 1100, 66, 44, 0.66);

  const chip = `
    <g transform="translate(118 392)">
      <rect width="150" height="114" rx="20" fill="url(#champagne)"/>
      <rect x="1.5" y="1.5" width="147" height="111" rx="19" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
      <g fill="none" stroke="#5c461c" stroke-opacity="0.55" stroke-width="2.2">
        <path d="M0 38 H46 M0 76 H46 M104 38 H150 M104 76 H150"/>
        <rect x="46" y="20" width="58" height="74" rx="12"/>
        <path d="M75 0 V20 M75 94 V114"/>
      </g>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" role="img" aria-label="Baroda Swim Front membership card for ${escapeXml(data.member.fullName || "member")}">
  <defs>${sharedDefs("front")}</defs>
  ${cardBody("front", images?.pool)}

  <!-- The academy crest in its own colours, large and crisp, with a soft shadow and a gold edge. -->
  <rect x="100" y="82" width="140" height="140" rx="32" fill="#0a3d7a" filter="url(#crestShadow)"/>
  <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="100" y="82" width="140" height="140" preserveAspectRatio="xMidYMid slice" clip-path="url(#frontCrest)"/>
  <rect x="101.5" y="83.5" width="137" height="137" rx="31" fill="none" stroke="url(#champagne)" stroke-width="3"/>
  <text x="274" y="148" font-family="${FONT}" font-size="40" font-weight="700" letter-spacing="5" fill="#ffffff" filter="url(#engrave)">BARODA SWIM FRONT</text>
  <text x="276" y="194" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="8" fill="url(#champagne)">SWIM FOR LIFE · VADODARA</text>

  <text x="1482" y="146" text-anchor="end" font-family="${FONT}" font-size="24" font-weight="700" letter-spacing="10" fill="url(#champagne)">MEMBER</text>
  <circle cx="${1482 - status.length * 16.6 - 16}" cy="184" r="6" fill="${statusColor(status)}"/>
  <text x="1482" y="191" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="500" letter-spacing="5" fill="#b9cbe0">${escapeXml(status.toUpperCase())}</text>

  ${chip}

  <text x="118" y="672" font-family="${MONO}" font-size="${numberSize}" font-weight="500" letter-spacing="7" fill="#ece6d8" filter="url(#engrave)">${escapeXml(number)}</text>

  ${plan ? `<text x="118" y="760" font-family="${FONT}" font-size="20" font-weight="500" letter-spacing="6" fill="#b9cbe0">${escapeXml(plan)}</text>` : ""}
  <text x="118" y="866" font-family="${FONT}" font-size="${nameSize}" font-weight="600" letter-spacing="6" fill="#ece6d8" filter="url(#engrave)">${escapeXml(name)}</text>

  <text x="1482" y="866" text-anchor="end" font-family="${MONO}" font-size="40" font-weight="500" letter-spacing="3" fill="#ece6d8" filter="url(#engrave)">${validThru(data.membership.expiryDate)}</text>
  <text x="1318" y="842" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="600" letter-spacing="3" fill="#b9cbe0">VALID</text>
  <text x="1318" y="862" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="600" letter-spacing="3" fill="#b9cbe0">THRU</text>
</svg>`;
}

/** Back of the card: photo, details and the QR for the counter. */
export function buildMembershipCardBackSvg(data: MemberDashboardData, images: CardImages): string {
  const name = data.member.fullName || "Member";
  const memberNo = data.member.membershipNo || "Pending";
  const batch = data.batch
    ? [formatBatchTime(data.batch.startTime), formatBatchTime(data.batch.endTime)].filter(Boolean).join(" – ") || data.batch.name
    : data.membership.batchName || "Not assigned yet";
  const from = formatMemberDate(data.membership.startDate) || "Pending";
  const thru = formatMemberDate(data.membership.expiryDate) || "Pending";
  const plan = data.membership.planName || "Plan not assigned";
  const label = (x: number, y: number, text: string) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="17" font-weight="600" letter-spacing="5" fill="#b9cbe0">${text}</text>`;
  const value = (x: number, y: number, text: string, size = 30) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${fitSize(text, 470, size, 22, 0.55)}" font-weight="500" fill="#ece6d8">${escapeXml(text)}</text>`;

  const photo = images.photo
    ? `<clipPath id="backPhoto"><rect x="104" y="318" width="248" height="300" rx="22"/></clipPath>
       <image href="${escapeXml(images.photo)}" x="104" y="318" width="248" height="300" preserveAspectRatio="xMidYMid slice" clip-path="url(#backPhoto)"/>`
    : `<rect x="104" y="318" width="248" height="300" rx="22" fill="#1b1e23"/>
       <text x="228" y="496" text-anchor="middle" font-family="${FONT}" font-size="84" font-weight="600" fill="url(#champagne)">${escapeXml(cardInitials(name))}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" role="img" aria-label="Back of the membership card">
  <defs>${sharedDefs("back")}</defs>
  ${cardBody("back", images.pool, "", 0.55)}

  ${photo}
  <rect x="98" y="312" width="260" height="312" rx="27" fill="none" stroke="url(#champagne)" stroke-width="2.5"/>

  <text x="420" y="350" font-family="${FONT}" font-size="${fitSize(name, 640, 40, 28, 0.56)}" font-weight="600" fill="#ece6d8">${escapeXml(name)}</text>
  <text x="420" y="394" font-family="${FONT}" font-size="24" font-weight="500" fill="url(#champagne)">${escapeXml(plan)}</text>
  ${label(420, 470, "MEMBER NO")}${value(420, 510, memberNo)}
  ${label(420, 572, "POOL TIME")}${value(420, 612, batch)}
  ${label(420, 674, "VALID")}${value(420, 714, `${from} – ${thru}`, 28)}

  ${images.qr ? `<rect x="1170" y="300" width="316" height="316" rx="26" fill="#f7f3ea"/>
  <rect x="1170" y="300" width="316" height="316" rx="26" fill="none" stroke="url(#champagne)" stroke-width="2.5"/>
  <image href="${escapeXml(images.qr)}" x="1196" y="326" width="264" height="264"/>
  <text x="1328" y="662" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" letter-spacing="5" fill="#b9cbe0">SCAN AT RECEPTION</text>` : ""}

  <line x1="104" y1="830" x2="1482" y2="830" stroke="url(#champagne)" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="104" y="884" font-family="${FONT}" font-size="19" fill="#a9bdd4">This card is personal and non-transferable. If found, please return it to Baroda Swim Front, Vadodara.</text>
  <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="1418" y="852" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#backCrestSmall)"/>
  <rect x="1418" y="852" width="64" height="64" rx="16" fill="none" stroke="url(#champagne)" stroke-width="1.5"/>
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
