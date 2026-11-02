import React, { useEffect, useState } from "react";
import { ArrowRight, Clock, Facebook, Instagram, LogIn, MapPin, Navigation, Phone, UserPlus, Users, Waves } from "lucide-react";
import { AcademyId } from "../types";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { ACADEMY_CONTACT } from "../member-dashboard/MemberSupportPage";
import { ACADEMY_SOCIAL } from "../member-dashboard/MemberSocialPopup";

// The public home page of Baroda Swim Front: what the academy offers, when the pool is open, what
// it costs, where it is, and the two actions that matter (register, sign in). Prices come from the
// live rate card (/api/membership-plans), so they always match what registration charges.

interface AcademyExploreProps {
  academyId: AcademyId;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
  onSelectAcademy?: (id: AcademyId | null) => void;
}

const PLAN_INFO: Array<{ category: string; name: string; text: string; icon: typeof Waves }> = [
  { category: "Learners", name: "Learners with coaching", text: "Learn to swim with stroke drills and a coach guiding you.", icon: Waves },
  { category: "Learners_Self", name: "Learners without coaching", text: "Practise at your own pace in your batch.", icon: Waves },
  { category: "General", name: "General", text: "Lane swimming for fitness and regular practice.", icon: Waves },
  { category: "Family", name: "Family", text: "Pool access for 2 adults with 1 or 2 children, 6 days a week.", icon: Users }
];

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const to12h = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`; };

export function AcademyExplore({ onOpenLogin, onOpenRegister }: AcademyExploreProps) {
  // Lowest one-month price per plan family, from the rate card.
  const [fromPrice, setFromPrice] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("/api/membership-plans")
      .then((res) => (res.ok ? res.json() : []))
      .then((plans: any[]) => {
        if (!Array.isArray(plans)) return;
        const out: Record<string, number> = {};
        for (const p of plans) {
          if (Number(p.is_active ?? 1) === 0 || p.duration_code !== "1_month") continue;
          const family = String(p.plan_category || "").startsWith("Family") ? "Family" : String(p.plan_category || "");
          const fee = Number(p.renewal_fee || 0);
          if (fee > 0 && (!out[family] || fee < out[family])) out[family] = fee;
        }
        setFromPrice(out);
      })
      .catch(() => setFromPrice({}));
  }, []);

  const [morning, evening] = ACADEMY_CONTACT.sessions;

  return (
    <div className="w-full bg-canvas text-ink-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink-950 px-5 pb-14 pt-28 text-white sm:pt-32">
        <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-55" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1600)" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/50 via-ink-950/60 to-ink-950" />
        <div className="mx-auto max-w-3xl text-center">
          <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-2xl ring-1 ring-white/25" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-aqua-300">Swimming academy · Vadodara</p>
          <h1 className="mt-3 font-display text-[34px] font-bold leading-tight tracking-[-0.02em] sm:text-5xl">Learn to swim at Baroda Swim Front</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/80 sm:text-base">
            Coached learning for beginners and improving swimmers, and lane swimming for fitness. Morning and evening batches, Monday to Saturday, at Aark International School.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <button id="btn-explore-register" type="button" onClick={onOpenRegister} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-semibold text-ink-950 hover:bg-ink-50 cursor-pointer">
              <UserPlus className="h-5 w-5" /> Register now
            </button>
            <button id="btn-explore-login" type="button" onClick={onOpenLogin} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 text-[15px] font-semibold text-white backdrop-blur hover:bg-white/20 cursor-pointer">
              <LogIn className="h-5 w-5" /> Member sign in
            </button>
          </div>
          <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2 text-left sm:gap-4">
            {[
              ["Morning", morning ? `${to12h(morning[0])} – ${to12h(morning[1])}` : "—"],
              ["Evening", evening ? `${to12h(evening[0])} – ${to12h(evening[1])}` : "—"],
              ["Days", "Mon – Sat"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 backdrop-blur sm:px-4">
                <dt className="text-xs text-white/60">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold sm:text-base">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-5xl px-5 py-14" aria-labelledby="plans-title">
        <h2 id="plans-title" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950 sm:text-3xl">Memberships</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-600">Choose 3 or 6 days a week, from 1 month to a year. Longer plans cost less per month. A one-time registration fee applies.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_INFO.map((p) => (
            <article key={p.category} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600"><p.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-base font-bold text-ink-950">{p.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-6 text-ink-600">{p.text}</p>
              {fromPrice[p.category] && <p className="mt-4 text-sm text-ink-500">from <span className="text-lg font-bold text-ink-950">{rupees(fromPrice[p.category])}</span> / month</p>}
            </article>
          ))}
        </div>
        <button type="button" onClick={onOpenRegister} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-semibold text-white hover:bg-ink-800 cursor-pointer">
          See all plans and register <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* How joining works */}
      <section className="border-y border-ink-100 bg-white" aria-labelledby="how-title">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 id="how-title" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950 sm:text-3xl">How joining works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Register online", "Pick your plan and pool time, and fill in your details. It takes about 3 minutes."],
              ["The academy approves", "Staff check your details and send a secure payment link on WhatsApp."],
              ["Pay and swim", "Pay online or at the reception. Your membership starts and the invoice arrives on WhatsApp."]
            ].map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-ink-100 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 text-base font-bold text-ink-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Visit */}
      <section className="mx-auto max-w-5xl px-5 py-14" aria-labelledby="visit-title">
        <h2 id="visit-title" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950 sm:text-3xl">Visit us</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <iframe title="Baroda Swim Front on Google Maps" src={ACADEMY_CONTACT.mapEmbedUrl} className="block h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
          <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <p className="flex gap-3 text-sm leading-6 text-ink-700"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-aqua-600" />{ACADEMY_CONTACT.address}</p>
            <p className="flex gap-3 text-sm leading-6 text-ink-700"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-aqua-600" />Monday to Saturday{morning ? `, ${to12h(morning[0])} – ${to12h(morning[1])}` : ""}{evening ? ` and ${to12h(evening[0])} – ${to12h(evening[1])}` : ""}. Closed on Sunday.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a href={`tel:${ACADEMY_CONTACT.phoneTel}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink-950 text-sm font-semibold text-white hover:bg-ink-800"><Phone className="h-4 w-4" />Call</a>
              <a href={ACADEMY_CONTACT.mapsUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 hover:bg-ink-50"><Navigation className="h-4 w-4" />Directions</a>
            </div>
            <div className="border-t border-ink-100 pt-4">
              <p className="text-sm font-semibold text-ink-900">Follow us</p>
              <div className="mt-2 flex gap-2">
                <a href={ACADEMY_SOCIAL.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"><Instagram className="h-4 w-4" />{ACADEMY_SOCIAL.instagramHandle}</a>
                <a href={ACADEMY_SOCIAL.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"><Facebook className="h-4 w-4" />Facebook</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 bg-white px-5 py-8 text-center text-sm text-ink-500">
        <p className="font-semibold text-ink-800">Baroda Swim Front</p>
        <p className="mt-1">{ACADEMY_CONTACT.phoneDisplay} · Vadodara, Gujarat</p>
        <p className="mt-3 text-xs">© {new Date().getFullYear()} Baroda Swim Front. All rights reserved.</p>
      </footer>
    </div>
  );
}
