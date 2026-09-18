import React from "react";
import {
  MembershipPlanRecord, MembershipType, PlanSelection, availableMembershipTypes,
  durationLabel, durationsForSelection, membershipTypeLabel, payableBreakdown,
  resolveRegistrationPlan, variantLabel, variantsForType
} from "../utils/membership-plan-catalog";

interface Props {
  plans: MembershipPlanRecord[];
  selection: PlanSelection;
  onChange: (selection: PlanSelection) => void;
  isSwim: boolean;
}

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function MembershipPlanSelector({ plans, selection, onChange, isSwim }: Props) {
  const types = availableMembershipTypes(plans);
  const variants = variantsForType(plans, selection.membershipType);
  const durations = durationsForSelection(plans, selection);
  const resolution = resolveRegistrationPlan(plans, selection);
  const selectedPlan = resolution.plan;
  const card = isSwim ? "bg-sky-50/80 border-sky-200 text-slate-900" : "bg-emerald-950/70 border-emerald-800/60 text-emerald-100";
  const input = `w-full rounded-xl border px-3 py-3 text-sm ${isSwim ? "bg-white border-slate-200" : "bg-emerald-950 border-emerald-800"}`;

  return <div className="space-y-5">
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-2">Membership Type <span className="text-red-500">*</span></label>
      <select name="membershipType" className={input} value={selection.membershipType}
        onChange={event => onChange({ membershipType: event.target.value as MembershipType, variant: "", duration: "" })}>
        <option value="">Select membership type</option>
        {types.map(type => <option key={type} value={type}>{membershipTypeLabel(type)}</option>)}
      </select>
    </div>

    {selection.membershipType && <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-2">
        {selection.membershipType === "Family" ? "Family Type" : selection.membershipType === "Guest" ? "Session Type" : selection.membershipType === "Group" ? "Group Option" : "Training Days"} <span className="text-red-500">*</span>
      </label>
      <select name="planVariant" className={input} value={selection.variant}
        onChange={event => onChange({ ...selection, variant: event.target.value, duration: "" })}>
        <option value="">Select option</option>
        {variants.map(variant => <option key={variant} value={variant}>{variantLabel(variant)}</option>)}
      </select>
    </div>}

    {selection.membershipType && selection.membershipType !== "Guest" && selection.membershipType !== "Group" && selection.variant && <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-2">Duration <span className="text-red-500">*</span></label>
      <select name="planDuration" className={input} value={selection.duration}
        onChange={event => onChange({ ...selection, duration: event.target.value })}>
        <option value="">Select duration</option>
        {durations.map(duration => <option key={duration} value={duration}>{durationLabel(duration)}</option>)}
      </select>
    </div>}

    {selection.membershipType === "Group" && selection.variant && <div className={`rounded-2xl border p-4 text-sm ${card}`}>
      <p className="font-bold">Group — {variantLabel(selection.variant)}</p>
      <p className="mt-1">2 hours · {money(Number(plans.find(plan => plan.plan_category === "Group" && plan.frequency_code === selection.variant)?.renewal_fee || 0))}</p>
      <p className="mt-2 text-xs opacity-75">Group bookings are not submitted as an individual member. Please contact administration so the group members and responsible contact can be recorded correctly.</p>
    </div>}

    {selectedPlan && (() => {
      const fee = payableBreakdown(selectedPlan);
      const duration = selection.membershipType === "Guest" ? selectedPlan.duration_code : selection.duration;
      return <div className={`rounded-2xl border p-5 space-y-2 text-sm ${card}`}>
        <h4 className="font-extrabold text-base mb-3">Fee Summary</h4>
        <div className="flex justify-between"><span>Selected Membership</span><strong>{membershipTypeLabel(selection.membershipType)}</strong></div>
        <div className="flex justify-between"><span>{selection.membershipType === "Family" ? "Family Type" : selection.membershipType === "Guest" ? "Session" : "Schedule"}</span><strong>{variantLabel(selection.variant)}</strong></div>
        <div className="flex justify-between"><span>Duration</span><strong>{durationLabel(duration)}</strong></div>
        <div className="flex justify-between pt-2"><span>Membership Fee</span><strong>{money(fee.membershipFee)}</strong></div>
        <div className="flex justify-between"><span>Registration Fee</span><strong>{money(fee.registrationFee)}</strong></div>
        <div className="flex justify-between"><span>Co-charge</span><strong>{money(fee.coCharge)}</strong></div>
        <div className="flex justify-between border-t border-current/20 pt-3 mt-3 text-base"><strong>Total Payable</strong><strong>{money(fee.total)}</strong></div>
        <p className="text-xs opacity-75 pt-2">Final payment link will be generated after your registration is approved.</p>
        <p className="text-[11px] opacity-65">Additional coaching (₹1,500/member/hour, 3 lessons/week) and compulsory costume charges remain separate and are not included unless explicitly applicable.</p>
      </div>;
    })()}

    {selection.membershipType && !selectedPlan && selection.variant && <p className="text-xs text-red-600 font-semibold" role="alert">{resolution.error}</p>}
  </div>;
}

