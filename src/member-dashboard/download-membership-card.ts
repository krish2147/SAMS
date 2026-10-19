import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import QRCode from "qrcode";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number, initialSize: number, minimumSize: number, weight = 700, family = "Inter, Arial, sans-serif") {
  let size = initialSize;
  while (size > minimumSize) {
    context.font = `${weight} ${size}px ${family}`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export function membershipCardFilename(membershipNo?: string | null) {
  const reference = membershipNo?.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${reference || "membership"}-membership-card.png`;
}

export function memberQrPayload(membershipNo: string) {
  return JSON.stringify({ type: "BSF_MEMBER_PASS", membershipNo, v: 1 });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Card image could not be loaded"));
    image.src = source;
  });
}

// Shared with the on-screen card (MemberDigitalCard) so the two always look the same.
export const CARD_GOLD = "#d6b56a";
export const CARD_BACKGROUND = "radial-gradient(130% 95% at 0% 0%, #1e2a44 0%, #0b1220 48%, #04070d 100%)";
export const CARD_SHEEN = "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.075) 46%, transparent 60%)";
export const cardStatusColor = (status: string) =>
  status === "Expiring Soon" ? "#f59e0b" : status === "Expired" ? "#94a3b8" : status === "Pending" ? "#38bdf8" : "#34d399";
export const cardInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";

export async function downloadMembershipCardPng(data: MemberDashboardData) {
  // Card proportions (85.6 x 54 mm) at print-friendly resolution.
  const W = 1586, H = 1000, PAD = 96;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  const spaced = (px: number) => { try { (ctx as any).letterSpacing = `${px}px`; } catch { /* older browsers */ } };
  const display = "Sora, Inter, Arial, sans-serif";

  roundedRect(ctx, 0, 0, W, H, 70);
  ctx.save();
  ctx.clip();

  // Black-navy body with a soft light from the top left, then a diagonal metal sheen.
  const base = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 1.3);
  base.addColorStop(0, "#1e2a44");
  base.addColorStop(0.48, "#0b1220");
  base.addColorStop(1, "#04070d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const sheen = ctx.createLinearGradient(0, 0, W, H * 0.6);
  sheen.addColorStop(0.3, "rgba(255,255,255,0)");
  sheen.addColorStop(0.46, "rgba(255,255,255,0.075)");
  sheen.addColorStop(0.6, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // Lane lines.
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = H - 550 + 330 + i * 48;
    ctx.strokeStyle = i % 2 ? "rgba(56,197,216,0.09)" : "rgba(214,181,106,0.09)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(260, y - 60, 520, y + 60, 793, y);
    ctx.bezierCurveTo(1066, y - 60, 1326, y - 60, W, y);
    ctx.stroke();
  }
  ctx.restore();

  // Gold hairline inside the edge.
  roundedRect(ctx, 25, 25, W - 50, H - 50, 52);
  ctx.strokeStyle = "rgba(214,181,106,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Logo and academy name.
  try {
    const logo = await loadImage(BARODA_SWIM_FRONT_LOGO_DATA_URI);
    ctx.save();
    roundedRect(ctx, PAD, 86, 127, 127, 28);
    ctx.clip();
    ctx.drawImage(logo, PAD, 86, 127, 127);
    ctx.restore();
  } catch { /* logo is decoration */ }
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 41px Inter, Arial, sans-serif`;
  spaced(9);
  ctx.fillText("BARODA SWIM FRONT", PAD + 160, 142);
  ctx.fillStyle = CARD_GOLD;
  ctx.font = `600 30px Inter, Arial, sans-serif`;
  spaced(10);
  ctx.fillText("MEMBER", PAD + 160, 190);
  spaced(0);

  // Status, top right.
  const status = getMembershipDisplayStatus(data.membership.status, data.membership.expiryDate, data.membership.daysRemaining);
  ctx.font = "600 30px Inter, Arial, sans-serif";
  const statusW = ctx.measureText(status).width + 92;
  const statusX = W - PAD - statusW;
  roundedRect(ctx, statusX, 104, statusW, 62, 31);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = cardStatusColor(status);
  ctx.beginPath();
  ctx.arc(statusX + 36, 135, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(status, statusX + 58, 146);

  // Photo in a gold frame.
  const photoX = PAD, photoY = 470, photoS = 206;
  const frame = ctx.createLinearGradient(photoX, photoY, photoX + photoS, photoY + photoS);
  frame.addColorStop(0, CARD_GOLD);
  frame.addColorStop(1, "#8a6d2f");
  roundedRect(ctx, photoX, photoY, photoS, photoS, 35);
  ctx.fillStyle = frame;
  ctx.fill();
  let photoDrawn = false;
  if (data.member.photoUrl) {
    try {
      const photo = await loadImage(data.member.photoUrl);
      ctx.save();
      roundedRect(ctx, photoX + 6, photoY + 6, photoS - 12, photoS - 12, 30);
      ctx.clip();
      const scale = Math.max((photoS - 12) / photo.width, (photoS - 12) / photo.height);
      const w = photo.width * scale, h = photo.height * scale;
      ctx.drawImage(photo, photoX + 6 + (photoS - 12 - w) / 2, photoY + 6 + (photoS - 12 - h) / 2, w, h);
      ctx.restore();
      photoDrawn = true;
    } catch { /* fall back to initials */ }
  }
  if (!photoDrawn) {
    roundedRect(ctx, photoX + 6, photoY + 6, photoS - 12, photoS - 12, 30);
    ctx.fillStyle = "#0b1220";
    ctx.fill();
    ctx.fillStyle = CARD_GOLD;
    ctx.font = `700 70px ${display}`;
    ctx.textAlign = "center";
    ctx.fillText(cardInitials(data.member.fullName), photoX + photoS / 2, photoY + photoS / 2 + 25);
    ctx.textAlign = "left";
  }

  // Name and plan.
  const textX = photoX + photoS + 48;
  const qrBox = 268;
  const textMax = W - PAD - qrBox - 48 - textX;
  const nameSize = fitText(ctx, data.member.fullName, textMax, 73, 40, 700, display);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${nameSize}px ${display}`;
  ctx.fillText(data.member.fullName, textX, photoY + 104);
  if (data.membership.planName) {
    const planSize = fitText(ctx, data.membership.planName, textMax, 40, 26, 500);
    ctx.fillStyle = CARD_GOLD;
    ctx.font = `500 ${planSize}px Inter, Arial, sans-serif`;
    ctx.fillText(data.membership.planName, textX, photoY + 166);
  }

  // QR in a white tile.
  if (data.member.membershipNo) {
    const qrDataUrl = await QRCode.toDataURL(memberQrPayload(data.member.membershipNo), {
      width: 480, margin: 0, color: { dark: "#0b1220", light: "#ffffff" }, errorCorrectionLevel: "H"
    });
    const qrImage = await loadImage(qrDataUrl);
    const qx = W - PAD - qrBox, qy = photoY + photoS - qrBox;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    roundedRect(ctx, qx, qy, qrBox, qrBox, 28);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.drawImage(qrImage, qx + 19, qy + 19, qrBox - 38, qrBox - 38);
  }

  // Member no., valid from, valid thru.
  const lineY = 733;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, lineY);
  ctx.lineTo(W - PAD, lineY);
  ctx.stroke();
  const fields: Array<[string, string, number, CanvasTextAlign, boolean]> = [
    ["MEMBER NO", data.member.membershipNo || "Pending", PAD, "left", true],
    ["VALID FROM", formatMemberDate(data.membership.startDate) || "Pending", PAD + 560, "left", false],
    ["VALID THRU", formatMemberDate(data.membership.expiryDate) || "Pending", W - PAD, "right", false],
  ];
  for (const [label, value, x, align, mono] of fields) {
    ctx.textAlign = align;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 25px Inter, Arial, sans-serif";
    spaced(5);
    ctx.fillText(label, x, lineY + 66);
    ctx.fillStyle = "#ffffff";
    ctx.font = mono ? "600 41px ui-monospace, Menlo, Consolas, monospace" : "600 41px Inter, Arial, sans-serif";
    spaced(mono ? 2 : 0);
    ctx.fillText(value, x, lineY + 122);
  }
  spaced(0);
  ctx.textAlign = "left";

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
