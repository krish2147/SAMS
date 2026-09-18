export type MembershipType = "Learners" | "General" | "Family" | "Guest" | "Group";

export interface MembershipPlanRecord {
  id: number | string;
  name: string;
  plan_code?: string;
  plan_category: string;
  frequency_code: string;
  duration_code: string;
  duration_months?: number;
  registration_fee: number | string;
  renewal_fee: number | string;
  co_charge: number | string;
  is_active?: number | boolean;
}

export interface PlanSelection {
  membershipType: MembershipType | "";
  variant: string;
  duration: string;
}

const TYPE_ORDER: MembershipType[] = ["Learners", "General", "Family", "Guest", "Group"];
const DURATION_ORDER = ["hourly", "weekend_hourly", "1_month", "3_months", "6_months", "9_months", "annual", "one_time"];

export const membershipTypeForPlan = (plan: MembershipPlanRecord): MembershipType | null => {
  if (plan.plan_category === "Family_4" || plan.plan_category === "Family_3") return "Family";
  if (TYPE_ORDER.includes(plan.plan_category as MembershipType)) return plan.plan_category as MembershipType;
  return null;
};

export const isActivePlan = (plan: MembershipPlanRecord) => Number(plan.is_active ?? 1) !== 0;

export const availableMembershipTypes = (plans: MembershipPlanRecord[]) => {
  const present = new Set(plans.filter(isActivePlan).map(membershipTypeForPlan).filter(Boolean));
  return TYPE_ORDER.filter(type => present.has(type));
};

export const variantsForType = (plans: MembershipPlanRecord[], type: MembershipType | "") => {
  const matching = plans.filter(plan => isActivePlan(plan) && membershipTypeForPlan(plan) === type);
  const values = new Set<string>();
  for (const plan of matching) {
    if (type === "Family") values.add(plan.plan_category);
    else if (type === "Guest") values.add(plan.duration_code);
    else values.add(plan.frequency_code);
  }
  const order = type === "Family" ? ["Family_4", "Family_3"]
    : type === "Guest" ? ["hourly", "weekend_hourly"]
      : ["6_days", "3_days", "fixed"];
  return order.filter(value => values.has(value));
};

const planMatchesVariant = (plan: MembershipPlanRecord, selection: PlanSelection) => {
  if (selection.membershipType === "Family") return plan.plan_category === selection.variant;
  if (selection.membershipType === "Guest") return plan.duration_code === selection.variant;
  return plan.frequency_code === selection.variant;
};

export const durationsForSelection = (plans: MembershipPlanRecord[], selection: PlanSelection) => {
  if (!selection.membershipType || !selection.variant || selection.membershipType === "Guest") return [];
  const values = new Set(plans.filter(plan =>
    isActivePlan(plan) && membershipTypeForPlan(plan) === selection.membershipType && planMatchesVariant(plan, selection)
  ).map(plan => plan.duration_code));
  return DURATION_ORDER.filter(value => values.has(value));
};

export const resolveRegistrationPlan = (plans: MembershipPlanRecord[], selection: PlanSelection) => {
  if (!selection.membershipType) return { plan: null, error: "Select a membership type." };
  if (selection.membershipType === "Group") {
    return { plan: null, error: "Group bookings require a group/contact workflow and cannot be submitted as an individual membership." };
  }
  if (!selection.variant) return { plan: null, error: "Select the required membership option." };
  if (selection.membershipType !== "Guest" && !selection.duration) return { plan: null, error: "Select a duration." };

  const matches = plans.filter(plan =>
    isActivePlan(plan) &&
    membershipTypeForPlan(plan) === selection.membershipType &&
    planMatchesVariant(plan, selection) &&
    (selection.membershipType === "Guest" || plan.duration_code === selection.duration)
  );
  if (matches.length === 0) return { plan: null, error: "No active database plan matches this exact selection. Please contact the administrator." };
  if (matches.length > 1) return { plan: null, error: `Plan configuration is ambiguous (${matches.length} active matches). Please contact the administrator.` };
  return { plan: matches[0], error: null };
};

export const membershipTypeLabel = (type: MembershipType | "") => ({
  Learners: "Learners", General: "General", Family: "Family Membership",
  Guest: "Guest / Without Membership", Group: "Group"
}[type] || "");

export const variantLabel = (variant: string) => ({
  "6_days": "6 days/week", "3_days": "3 days/week",
  Family_4: "2 adults + 2 kids", Family_3: "2 adults + 1 kid",
  hourly: "Monday to Friday", weekend_hourly: "Saturday & Sunday", fixed: "Maximum 50 members"
}[variant] || variant);

export const durationLabel = (duration: string) => ({
  "1_month": "1 Month", "3_months": "3 Months", "6_months": "6 Months",
  "9_months": "9 Months", annual: "Annual", hourly: "1 Hour",
  weekend_hourly: "1 Hour", one_time: "2 Hours"
}[duration] || duration);

export const payableBreakdown = (plan: MembershipPlanRecord) => {
  const membershipFee = Number(plan.renewal_fee || 0);
  const registrationFee = Number(plan.registration_fee || 0);
  const coCharge = Number(plan.co_charge || 0);
  return { membershipFee, registrationFee, coCharge, total: membershipFee + registrationFee + coCharge };
};

