import type { ComponentType } from "react";
import { Bell, CalendarClock, CalendarDays, CircleHelp, CreditCard, Home, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

export type MemberSection = "overview" | "membership" | "batch" | "payments" | "calendar" | "notifications" | "profile" | "security" | "support";

export interface MemberNavigationItem {
  id: MemberSection;
  label: string;
  shortLabel?: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export const primaryNavigation: MemberNavigationItem[] = [
  { id: "overview", label: "Overview", shortLabel: "Home", description: "Your membership at a glance", icon: Home },
  { id: "membership", label: "Membership", description: "Plan and membership details", icon: ShieldCheck },
  { id: "batch", label: "My Batch", shortLabel: "Batch", description: "Your assigned batch information", icon: CalendarClock },
  { id: "payments", label: "Payments & Invoices", shortLabel: "Payments", description: "Payment history and invoices", icon: CreditCard },
  { id: "calendar", label: "Calendar & Events", shortLabel: "Calendar", description: "Upcoming events and important dates", icon: CalendarDays },
  { id: "notifications", label: "Notifications", description: "Updates from the academy", icon: Bell },
];

export const accountNavigation: MemberNavigationItem[] = [
  { id: "profile", label: "Profile", description: "Your personal details", icon: UserRound },
  { id: "security", label: "Security", description: "Account access and security", icon: LockKeyhole },
  { id: "support", label: "Help & Support", description: "Contact the academy for assistance", icon: CircleHelp },
];

export const memberNavigation = [...primaryNavigation, ...accountNavigation];
export const mobilePrimarySections: MemberSection[] = ["overview", "membership", "payments", "batch"];

/** Sections saved in the browser from an older version (e.g. the removed Attendance page) fall back to Home. */
export function isMemberSection(value: unknown): value is MemberSection {
  return memberNavigation.some((item) => item.id === value);
}

export function findMemberNavigationItem(section: MemberSection) {
  return memberNavigation.find((item) => item.id === section) ?? primaryNavigation[0];
}
