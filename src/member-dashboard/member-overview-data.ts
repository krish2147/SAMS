export interface MemberNotification {
  title: string;
  message: string;
  type?: string | null;
  isRead: boolean;
  createdAt?: string | null;
}

export interface MemberDashboardData {
  member: { fullName: string; membershipNo?: string | null };
  membership: {
    status?: string | null;
    planName?: string | null;
    startDate?: string | null;
    expiryDate?: string | null;
    daysRemaining?: number | null;
    durationMonths?: number | null;
    paymentStatus?: string | null;
    batchName?: string | null;
  };
  batch?: { name: string; startTime?: string | null; endTime?: string | null } | null;
  notifications?: MemberNotification[];
}

export interface MemberPayment {
  amount: number;
  status?: string | null;
  paymentDate?: string | null;
  planName?: string | null;
  receiptNo?: string | null;
  invoiceNo?: string | null;
  hasReceipt: boolean;
  hasInvoice?: boolean;
  paymentMethod?: string | null;
  refundAmount?: number;
  refundStatus?: string | null;
  refundDate?: string | null;
}

export type MembershipDisplayStatus = "Active" | "Expiring Soon" | "Expired" | "Pending";
export const EXPIRING_SOON_DAYS = 4;

function parseDateOnly(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

export function firstName(fullName?: string | null) {
  return fullName?.trim().split(/\s+/)[0] || "Member";
}

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatMemberDate(value?: string | null) {
  const timestamp = parseDateOnly(value);
  if (timestamp === null) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp);
}

export function formatBatchTime(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

export function getMembershipDisplayStatus(status?: string | null, expiryDate?: string | null, daysRemaining?: number | null): MembershipDisplayStatus {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "expired" || (expiryDate && typeof daysRemaining === "number" && daysRemaining < 0)) return "Expired";
  if (normalized !== "active") return "Pending";
  if (typeof daysRemaining === "number" && daysRemaining <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Active";
}

export function membershipProgress(startDate?: string | null, expiryDate?: string | null, now = new Date()) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(expiryDate);
  if (start === null || end === null || end <= start) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.min(100, Math.max(0, Math.round(((today - start) / (end - start)) * 100)));
}

export function calendarDaysFromToday(value?: string | null, now = new Date()) {
  const target = parseDateOnly(value);
  if (target === null) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function receiptHref(payment?: MemberPayment | null) {
  return payment?.hasReceipt && payment.receiptNo
    ? `/api/member/payments/receipt/${encodeURIComponent(payment.receiptNo)}`
    : null;
}

export function receiptDownloadHref(payment?: MemberPayment | null) {
  const href = receiptHref(payment);
  return href ? `${href}?download=true` : null;
}

export function invoiceHref(payment?: MemberPayment | null) {
  return payment?.hasInvoice && payment.invoiceNo
    ? `/api/member/payments/invoice/${encodeURIComponent(payment.invoiceNo)}`
    : null;
}

export function invoiceDownloadHref(payment?: MemberPayment | null) {
  const href = invoiceHref(payment);
  return href ? `${href}?download=true` : null;
}
