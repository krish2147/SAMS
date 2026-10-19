import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import QRCode from "qrcode";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

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
}

/** Everything the card needs that has to be fetched or generated first, as data URLs. */
export async function prepareCardImages(data: MemberDashboardData): Promise<CardImages> {
  const qr = data.member.membershipNo
    ? await QRCode.toDataURL(memberQrPayload(data.member.membershipNo), {
        width: 480, margin: 0, color: { dark: "#0a1f3d", light: "#ffffff" }, errorCorrectionLevel: "H"
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
  return { qr, photo };
}

export function buildMembershipCardSvg(data: MemberDashboardData, images: CardImages): string {
  const W = CARD_WIDTH, H = CARD_HEIGHT;
  const name = data.member.fullName || "Member";
  const plan = data.membership.planName || "Plan not assigned";
  const status = getMembershipDisplayStatus(data.membership.status, data.membership.expiryDate, data.membership.daysRemaining);
  const from = formatMemberDate(data.membership.startDate) || "Pending";
  const thru = formatMemberDate(data.membership.expiryDate) || "Pending";
  const memberNo = data.member.membershipNo || "Pending";
  const nameSize = fitSize(name, 760, 76, 44);
  const planSize = fitSize(plan, 760, 38, 26, 0.52);
  const statusWidth = status.length * 17 + 84;
  const font = "Sora, Inter, 'Segoe UI', Arial, sans-serif";

  const ripples = Array.from({ length: 7 }, (_, i) => {
    const y = 120 + i * 70;
    return `<path d="M-40 ${y} C 180 ${y - 26}, 360 ${y + 26}, 580 ${y} S 980 ${y - 26}, 1200 ${y} S 1500 ${y + 26}, 1640 ${y}" fill="none" stroke="#ffffff" stroke-opacity="${0.035 + (i % 3) * 0.012}" stroke-width="${2 + (i % 2)}"/>`;
  }).join("");

  const photo = images.photo
    ? `<image href="${escapeXml(images.photo)}" x="106" y="356" width="220" height="220" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>`
    : `<circle cx="216" cy="466" r="110" fill="#0a1f3d"/><text x="216" y="492" text-anchor="middle" font-family="${font}" font-size="76" font-weight="700" fill="url(#gold)">${escapeXml(cardInitials(name))}</text>`;

  const qr = images.qr
    ? `<g filter="url(#shadow)"><rect x="1214" y="300" width="276" height="276" rx="30" fill="#ffffff"/></g>
       <image href="${escapeXml(images.qr)}" x="1236" y="322" width="232" height="232"/>
       <text x="1352" y="622" text-anchor="middle" font-family="${font}" font-size="22" font-weight="600" letter-spacing="5" fill="#ffffff" fill-opacity="0.75">SCAN AT COUNTER</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Baroda Swim Front membership card for ${escapeXml(name)}">
  <defs>
    <clipPath id="cardClip"><rect width="${W}" height="${H}" rx="64"/></clipPath>
    <clipPath id="photoClip"><circle cx="216" cy="466" r="110"/></clipPath>
    <clipPath id="logoClip"><rect x="96" y="82" width="124" height="124" rx="28"/></clipPath>
    <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#030f24"/>
      <stop offset="0.42" stop-color="#08305e"/>
      <stop offset="0.78" stop-color="#0a5f8c"/>
      <stop offset="1" stop-color="#0e8fb3"/>
    </linearGradient>
    <radialGradient id="poolLight" cx="0.82" cy="0.05" r="0.75">
      <stop offset="0" stop-color="#67e8f9" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#22d3ee" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbeec1"/>
      <stop offset="0.35" stop-color="#e2c27a"/>
      <stop offset="0.6" stop-color="#b38b3e"/>
      <stop offset="1" stop-color="#f6e2a4"/>
    </linearGradient>
    <linearGradient id="waveBack" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="waveMid" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0ea5e9" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#14b8a6" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="waveFront" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#062347"/>
      <stop offset="1" stop-color="#020b1c"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0.28" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.09"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000814" flood-opacity="0.45"/></filter>
  </defs>

  <g clip-path="url(#cardClip)">
    <rect width="${W}" height="${H}" fill="url(#ocean)"/>
    <rect width="${W}" height="${H}" fill="url(#poolLight)"/>
    ${ripples}
    <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="820" y="-120" width="760" height="760" opacity="0.07"/>
    <path d="M0 640 C 220 590, 420 690, 700 640 S 1200 580, 1586 650 L1586 1000 L0 1000 Z" fill="url(#waveBack)"/>
    <path d="M0 690 C 260 650, 480 740, 780 690 S 1260 640, 1586 700 L1586 1000 L0 1000 Z" fill="url(#waveMid)"/>
    <path d="M0 735 C 300 700, 520 780, 820 735 S 1300 700, 1586 742 L1586 1000 L0 1000 Z" fill="url(#waveFront)"/>
    <path d="M0 735 C 300 700, 520 780, 820 735 S 1300 700, 1586 742" fill="none" stroke="#a5f3fc" stroke-opacity="0.5" stroke-width="3"/>
    <rect width="${W}" height="${H}" fill="url(#sheen)"/>
  </g>
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="46" fill="none" stroke="url(#gold)" stroke-opacity="0.55" stroke-width="2.5"/>

  <image href="${BARODA_SWIM_FRONT_LOGO_DATA_URI}" x="96" y="82" width="124" height="124" clip-path="url(#logoClip)"/>
  <rect x="96" y="82" width="124" height="124" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
  <text x="252" y="138" font-family="${font}" font-size="42" font-weight="700" letter-spacing="8" fill="#ffffff">BARODA SWIM FRONT</text>
  <text x="252" y="188" font-family="${font}" font-size="28" font-weight="700" letter-spacing="12" fill="url(#gold)">MEMBER</text>

  <rect x="${1490 - statusWidth}" y="100" width="${statusWidth}" height="62" rx="31" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
  <circle cx="${1490 - statusWidth + 36}" cy="131" r="10" fill="${statusColor(status)}"/>
  <text x="${1490 - statusWidth + 58}" y="142" font-family="${font}" font-size="29" font-weight="600" fill="#ffffff">${escapeXml(status)}</text>

  <circle cx="216" cy="466" r="122" fill="url(#gold)"/>
  <circle cx="216" cy="466" r="114" fill="#0a1f3d"/>
  ${photo}

  <text x="370" y="455" font-family="${font}" font-size="${nameSize}" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>
  <text x="372" y="${455 + planSize + 26}" font-family="${font}" font-size="${planSize}" font-weight="600" fill="url(#gold)">${escapeXml(plan)}</text>

  ${qr}

  <g font-family="${font}">
    <text x="96" y="852" font-size="24" font-weight="600" letter-spacing="6" fill="#a5f3fc" fill-opacity="0.8">MEMBER NO</text>
    <text x="96" y="908" font-size="42" font-weight="700" letter-spacing="3" fill="#ffffff">${escapeXml(memberNo)}</text>
    <text x="700" y="852" font-size="24" font-weight="600" letter-spacing="6" fill="#a5f3fc" fill-opacity="0.8">VALID FROM</text>
    <text x="700" y="908" font-size="42" font-weight="700" fill="#ffffff">${escapeXml(from)}</text>
    <text x="1490" y="852" text-anchor="end" font-size="24" font-weight="600" letter-spacing="6" fill="#a5f3fc" fill-opacity="0.8">VALID THRU</text>
    <text x="1490" y="908" text-anchor="end" font-size="42" font-weight="700" fill="#ffffff">${escapeXml(thru)}</text>
  </g>
</svg>`;
}

export async function downloadMembershipCardPng(data: MemberDashboardData) {
  const images = await prepareCardImages(data);
  const svg = buildMembershipCardSvg(data, images);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Card image could not be drawn"));
      img.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
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
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
