import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import QRCode from "qrcode";

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

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number, initialSize: number, minimumSize: number, weight = 700) {
  let size = initialSize;
  while (size > minimumSize) {
    context.font = `${weight} ${size}px Inter, Arial, sans-serif`;
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
    image.onerror = () => reject(new Error("Member QR image could not be loaded"));
    image.src = source;
  });
}

export async function downloadMembershipCardPng(data: MemberDashboardData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 680;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.58, "#0f172a");
  gradient.addColorStop(1, "#164e63");
  roundedRect(context, 8, 8, 1184, 664, 38);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = "rgba(103, 232, 249, 0.32)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#22d3ee";
  context.fillRect(8, 650, 1184, 22);
  context.fillStyle = "#67e8f9";
  context.font = "700 25px Inter, Arial, sans-serif";
  context.fillText("BARODA SWIM FRONT", 72, 92);
  context.fillStyle = "#94a3b8";
  context.font = "600 19px Inter, Arial, sans-serif";
  context.fillText("DIGITAL MEMBERSHIP", 72, 126);

  const status = getMembershipDisplayStatus(data.membership.status, data.membership.expiryDate, data.membership.daysRemaining);
  const statusWidth = Math.max(126, context.measureText(status).width + 52);
  roundedRect(context, 1055 - statusWidth, 60, statusWidth, 54, 27);
  context.fillStyle = status === "Expiring Soon" ? "#fef3c7" : status === "Expired" ? "#e2e8f0" : status === "Pending" ? "#e0f2fe" : "#d1fae5";
  context.fill();
  context.fillStyle = status === "Expiring Soon" ? "#92400e" : status === "Expired" ? "#334155" : status === "Pending" ? "#075985" : "#047857";
  context.font = "700 20px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(status, 1055 - statusWidth / 2, 94);
  context.textAlign = "left";

  context.fillStyle = "#94a3b8";
  context.font = "500 22px Inter, Arial, sans-serif";
  context.fillText("MEMBER", 72, 232);
  const nameSize = fitText(context, data.member.fullName, 800, 52, 34);
  context.fillStyle = "#ffffff";
  context.font = `700 ${nameSize}px Inter, Arial, sans-serif`;
  context.fillText(data.member.fullName, 72, 292);

  if (data.membership.planName) {
    const planSize = fitText(context, data.membership.planName, 800, 30, 22, 600);
    context.fillStyle = "#a5f3fc";
    context.font = `600 ${planSize}px Inter, Arial, sans-serif`;
    context.fillText(data.membership.planName, 72, 350);
  }
  if (data.member.membershipNo) {
    context.fillStyle = "#94a3b8";
    context.font = "500 21px Inter, Arial, sans-serif";
    context.fillText("MEMBERSHIP NO.", 72, 405);
    context.fillStyle = "#e2e8f0";
    context.font = "700 24px Inter, Arial, sans-serif";
    context.fillText(data.member.membershipNo, 282, 405);

    const qrDataUrl = await QRCode.toDataURL(memberQrPayload(data.member.membershipNo), {
      width: 360,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H"
    });
    const qrImage = await loadImage(qrDataUrl);
    context.fillStyle = "#94a3b8";
    context.font = "600 17px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("SCAN MEMBER ID", 1030, 228);
    roundedRect(context, 924, 246, 212, 212, 20);
    context.fillStyle = "#ffffff";
    context.fill();
    context.drawImage(qrImage, 940, 262, 180, 180);
    context.textAlign = "left";
  }

  context.strokeStyle = "rgba(148, 163, 184, 0.25)";
  context.beginPath();
  context.moveTo(72, 466);
  context.lineTo(1128, 466);
  context.stroke();
  const startDate = formatMemberDate(data.membership.startDate);
  const expiryDate = formatMemberDate(data.membership.expiryDate);
  if (startDate) {
    context.fillStyle = "#94a3b8";
    context.font = "500 19px Inter, Arial, sans-serif";
    context.fillText("START DATE", 72, 522);
    context.fillStyle = "#f8fafc";
    context.font = "700 27px Inter, Arial, sans-serif";
    context.fillText(startDate, 72, 564);
  }
  if (expiryDate) {
    context.textAlign = "right";
    context.fillStyle = "#94a3b8";
    context.font = "500 19px Inter, Arial, sans-serif";
    context.fillText("EXPIRY DATE", 1128, 522);
    context.fillStyle = "#f8fafc";
    context.font = "700 27px Inter, Arial, sans-serif";
    context.fillText(expiryDate, 1128, 564);
    context.textAlign = "left";
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
