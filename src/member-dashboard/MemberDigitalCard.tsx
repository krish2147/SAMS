import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { memberQrPayload, CARD_GOLD, CARD_BACKGROUND, CARD_SHEEN, cardStatusColor, cardInitials } from "./download-membership-card";

// The member's card, drawn like a premium plastic card: real card proportions, black-navy with a
// metal sheen, a gold hairline and lane lines. Everything is sized from the card's own width
// (cqw), so it looks the same on a phone and a desktop, and matches the downloaded PNG.

export function MemberDigitalCard({ data }: { data: MemberDashboardData }) {
  const { member, membership } = data;
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const start = formatMemberDate(membership.startDate);
  const expiry = formatMemberDate(membership.expiryDate);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!member.membershipNo) return;
    let cancelled = false;
    QRCode.toDataURL(memberQrPayload(member.membershipNo), { width: 320, margin: 0, color: { dark: "#0b1220", light: "#ffffff" }, errorCorrectionLevel: "H" })
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [member.membershipNo]);

  return (
    <section
      aria-labelledby="digital-membership-card-title"
      className="@container relative w-full self-start overflow-hidden rounded-[4.5cqw] text-white shadow-[0_30px_60px_-24px_rgba(2,6,23,0.65)] ring-1 ring-white/10"
      style={{ aspectRatio: "1.586", background: CARD_BACKGROUND }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: CARD_SHEEN }} />
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full" viewBox="0 0 1586 550" preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M0 ${330 + i * 48} C 260 ${270 + i * 48}, 520 ${390 + i * 48}, 793 ${330 + i * 48} S 1326 ${270 + i * 48}, 1586 ${330 + i * 48}`} fill="none" stroke={i % 2 ? "#38c5d8" : CARD_GOLD} strokeOpacity={0.09} strokeWidth={3} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-[1.6cqw] rounded-[3.4cqw] border" style={{ borderColor: `${CARD_GOLD}40` }} />

      <div className="relative flex h-full flex-col px-[6cqw] pb-[5.4cqw] pt-[5.4cqw]">
        <div className="flex items-start justify-between gap-[2cqw]">
          <div className="flex items-center gap-[2.2cqw]">
            <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="" className="h-[8cqw] w-[8cqw] rounded-[1.8cqw] object-cover ring-1 ring-white/20" />
            <div>
              <p className="text-[2.6cqw] font-semibold tracking-[0.22em] text-white">BARODA SWIM FRONT</p>
              <p className="mt-[0.6cqw] text-[1.9cqw] font-semibold tracking-[0.32em]" style={{ color: CARD_GOLD }}>MEMBER</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-[1cqw] rounded-full border border-white/15 bg-white/5 px-[2cqw] py-[0.8cqw] text-[1.9cqw] font-semibold text-white/90">
            <span className="h-[1.3cqw] w-[1.3cqw] rounded-full" style={{ background: cardStatusColor(status) }} />
            {status}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-[3cqw]">
          <div className="flex min-w-0 items-center gap-[3cqw]">
            <div className="h-[13cqw] w-[13cqw] shrink-0 overflow-hidden rounded-[2.2cqw] p-[0.35cqw]" style={{ background: `linear-gradient(135deg, ${CARD_GOLD}, #8a6d2f)` }}>
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" className="h-full w-full rounded-[1.9cqw] object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-[1.9cqw] bg-[#0b1220] text-[4.4cqw] font-bold" style={{ color: CARD_GOLD }}>{cardInitials(member.fullName)}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 id="digital-membership-card-title" className="truncate font-display text-[4.6cqw] font-bold leading-tight tracking-[-0.01em] text-white">{member.fullName}</h2>
              <p className="mt-[0.8cqw] truncate text-[2.5cqw] font-medium" style={{ color: CARD_GOLD }}>{membership.planName || "Plan not assigned"}</p>
            </div>
          </div>
          {qr && (
            <div className="shrink-0 rounded-[1.8cqw] bg-white p-[1.2cqw] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <img src={qr} alt={`Member QR for ${member.membershipNo}`} className="h-[15cqw] w-[15cqw]" />
            </div>
          )}
        </div>

        <div className="mt-[3.6cqw] grid grid-cols-[1.3fr_1fr_1fr] gap-[2cqw] border-t border-white/10 pt-[2.6cqw]">
          <CardField label="MEMBER NO" value={member.membershipNo || "Pending"} mono />
          <CardField label="VALID FROM" value={start || "Pending"} />
          <CardField label="VALID THRU" value={expiry || "Pending"} right />
        </div>
      </div>
    </section>
  );
}

function CardField({ label, value, mono = false, right = false }: { label: string; value: string; mono?: boolean; right?: boolean }) {
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <p className="text-[1.6cqw] font-semibold tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-[0.6cqw] truncate text-[2.6cqw] font-semibold text-white ${mono ? "font-mono tracking-[0.06em]" : ""}`}>{value}</p>
    </div>
  );
}
