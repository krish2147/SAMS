import { calendarDaysBetween, calendarToday, toDateOnlyString } from "./membership-date";

export type MemberPresentationStatus =
  | "Active"
  | "Pending Payment"
  | "Expiring Soon"
  | "Expired"
  | "Inactive"
  | "Rejected";

export interface MemberLifecycleFields {
  registration_status?: string | null;
  payment_status?: string | null;
  membership_status?: string | null;
  login_enabled?: boolean | number | null;
  membership_end_date?: string | Date | null;
}

export function daysUntilMembershipExpiry(expiry: string | Date | null | undefined, now: Date = new Date()): number | null {
  const end = toDateOnlyString(expiry);
  if (!end) return null;
  return calendarDaysBetween(calendarToday(now), end);
}

export function deriveMemberPresentationStatus(member: MemberLifecycleFields, now: Date = new Date()): MemberPresentationStatus {
  if (member.registration_status === "Rejected") return "Rejected";
  if (member.registration_status === "Approved" && member.payment_status !== "Paid") return "Pending Payment";
  const daysRemaining = daysUntilMembershipExpiry(member.membership_end_date, now);
  if (member.membership_status === "Expired" || (daysRemaining !== null && daysRemaining < 0)) return "Expired";
  const active = member.registration_status === "Approved" && member.payment_status === "Paid"
    && member.membership_status === "Active" && Boolean(member.login_enabled);
  if (active && daysRemaining !== null && daysRemaining <= 7) return "Expiring Soon";
  if (active) return "Active";
  return "Inactive";
}

export const MEMBER_PRESENTATION_STATUSES: MemberPresentationStatus[] = [
  "Active", "Pending Payment", "Expiring Soon", "Expired", "Inactive", "Rejected"
];
