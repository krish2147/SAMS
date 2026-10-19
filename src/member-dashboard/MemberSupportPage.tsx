import React, { useEffect, useState } from "react";
import { ChevronDown, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { SettingsGroup, SettingsRow, SettingsTitle } from "../components/SettingsList";
import type { MemberSection } from "./member-navigation";

// Help & Support for members: how to reach the academy, when it is open, and answers to the
// questions the reception hears most. Contact details and hours are from the academy's Google
// Maps listing (Baroda Swim Front, Vadodara). Update ACADEMY_CONTACT if they change.

export const ACADEMY_CONTACT = {
  phoneDisplay: "+91 93132 41071",
  phoneTel: "+919313241071",
  address: "Aark International School, beside Vasna–Bhayli Main Rd, behind Adventura, near Priya Cinema, Vadodara, Gujarat 391101",
  mapsUrl: "https://maps.app.goo.gl/RpAvS2juSqnszx9Q6",
  // Monday = 1 … Sunday = 0. Times are 24-hour, India time.
  sessions: [["06:00", "10:00"], ["16:00", "20:00"]] as Array<[string, string]>,
  closedDays: [0]
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function to12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

/** "Open now · until 10 AM" / "Closed · opens 4 PM" / "Closed · opens Monday 6 AM", using India time. */
export function openStatus(now = new Date()): { open: boolean; text: string } {
  const india = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = india.getDay();
  const minutes = india.getHours() * 60 + india.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const isOpenDay = (d: number) => !ACADEMY_CONTACT.closedDays.includes(d);

  if (isOpenDay(day)) {
    for (const [start, end] of ACADEMY_CONTACT.sessions) {
      if (minutes >= toMin(start) && minutes < toMin(end)) return { open: true, text: `Open now · until ${to12h(end)}` };
    }
    const next = ACADEMY_CONTACT.sessions.find(([start]) => minutes < toMin(start));
    if (next) return { open: false, text: `Closed · opens ${to12h(next[0])}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (isOpenDay(d)) return { open: false, text: `Closed · opens ${i === 1 ? "tomorrow" : DAY_NAMES[d]} ${to12h(ACADEMY_CONTACT.sessions[0][0])}` };
  }
  return { open: false, text: "Closed" };
}

const FAQS: Array<{ q: string; a: string; go?: { label: string; section: MemberSection } }> = [
  {
    q: "How do I renew my membership?",
    a: "Visit the reception or call the academy before your expiry date. You can pay in cash at the desk or ask for an online payment link. Your new dates appear on My Membership as soon as the payment is recorded.",
    go: { label: "See my expiry date", section: "membership" }
  },
  {
    q: "Where is my invoice?",
    a: "Every paid payment has an invoice. Open Payments and tap View or Download next to the payment.",
    go: { label: "Open Payments", section: "payments" }
  },
  {
    q: "Can I change my batch timing?",
    a: "Yes, if there is space in the batch you want. Ask at the reception or call the academy, and your new timing will show on My Batch once staff confirm it.",
    go: { label: "Open My Batch", section: "batch" }
  },
  {
    q: "Is the pool open on holidays?",
    a: "Pool closures and academy events are on the Calendar, along with festivals. The academy also sends a message to everyone when the pool will be closed.",
    go: { label: "Open Calendar", section: "calendar" }
  },
  {
    q: "I am not getting the login code.",
    a: "The six-digit code goes by SMS to your registered mobile number and works for five minutes. Wait a minute and try again. If your number has changed, visit the reception with photo ID and staff will update it."
  },
  {
    q: "How do I use my membership card?",
    a: "Open your card on My Membership and show the QR code at the reception. You can also download the card to your phone.",
    go: { label: "Open my card", section: "membership" }
  },
  {
    q: "How do I update my details or photo?",
    a: "Your details are kept by the academy so your records stay correct. Ask at the reception and staff will update them for you.",
    go: { label: "See my profile", section: "profile" }
  }
];

export function MemberSupportPage({ onNavigate }: { onNavigate: (section: MemberSection) => void }) {
  const [status, setStatus] = useState(() => openStatus());
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setStatus(openStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todayIndia = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getDay();
  const week = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="mx-auto max-w-xl pb-6">
      <SettingsTitle>Help &amp; Support</SettingsTitle>

      {/* Contact */}
      <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-500">Baroda Swim Front</p>
        <p className="mt-1 text-[17px] text-slate-900">Questions about your membership, batch or payments? Call the academy or visit the reception.</p>
        <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${status.open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-500" : "bg-slate-400"}`} />
          {status.text}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={`tel:${ACADEMY_CONTACT.phoneTel}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-[15px] font-semibold text-white hover:bg-slate-800">
            <Phone className="h-5 w-5" />Call
          </a>
          <a href={ACADEMY_CONTACT.mapsUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:bg-slate-50">
            <Navigation className="h-5 w-5" />Directions
          </a>
        </div>
      </section>

      <SettingsGroup heading="Contact">
        <a href={`tel:${ACADEMY_CONTACT.phoneTel}`} className="block hover:bg-slate-50">
          <SettingsRow icon={Phone} title={ACADEMY_CONTACT.phoneDisplay} subtitle="Academy phone" />
        </a>
        <a href={ACADEMY_CONTACT.mapsUrl} target="_blank" rel="noreferrer" className="block hover:bg-slate-50">
          <SettingsRow icon={MapPin} title="Academy address" subtitle={ACADEMY_CONTACT.address} />
        </a>
      </SettingsGroup>

      <SettingsGroup heading="Opening hours">
        <div className="px-4 py-2">
          {week.map((d) => {
            const closed = ACADEMY_CONTACT.closedDays.includes(d);
            const today = d === todayIndia;
            return (
              <div key={d} className={`flex items-start justify-between gap-4 py-2.5 text-[15px] ${today ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                <span className="flex items-center gap-2">{DAY_NAMES[d]}{today && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">Today</span>}</span>
                {closed ? <span className="text-right text-rose-600">Closed</span> : (
                  <span className="text-right">{ACADEMY_CONTACT.sessions.map(([a, b]) => <span key={a} className="block whitespace-nowrap">{to12h(a)} – {to12h(b)}</span>)}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-3 px-4 py-3 text-sm text-slate-500">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          Hours can change on festivals. Check the Calendar for pool closures.
        </div>
      </SettingsGroup>

      <SettingsGroup heading="Common questions">
        {FAQS.map((faq, i) => {
          const open = openFaq === i;
          return (
            <div key={faq.q}>
              <button type="button" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left text-[16px] text-slate-900 hover:bg-slate-50 cursor-pointer">
                <span className="flex-1">{faq.q}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 text-[15px] leading-6 text-slate-600">
                  <p>{faq.a}</p>
                  {faq.go && (
                    <button type="button" onClick={() => onNavigate(faq.go!.section)} className="mt-2 min-h-11 text-[15px] font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer">
                      {faq.go.label} →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </SettingsGroup>
    </div>
  );
}
