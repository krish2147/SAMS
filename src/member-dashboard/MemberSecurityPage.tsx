import React, { useEffect, useState } from "react";
import { KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";

/** Shows only the last four digits, so the page is safe to read over someone's shoulder. */
function maskMobile(value?: string) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 4) return "your registered mobile number";
  const last4 = digits.slice(-4);
  return `+91 ••••• •${last4}`;
}

function Row({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-ink-100 py-5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600 ring-1 ring-inset ring-aqua-400/20">
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink-950">{title}</h3>
        <div className="mt-1.5 text-sm leading-6 text-ink-600">{children}</div>
      </div>
    </div>
  );
}

export function MemberSecurityPage({ onLogout }: { onLogout?: () => void }) {
  const [mobile, setMobile] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/member/profile", { credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.mobileNo) setMobile(String(data.mobileNo)); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <Row icon={Smartphone} title="How you sign in">
          Your account uses a one-time password. Each time you sign in, a six-digit code is sent by SMS to{" "}
          <span className="font-semibold text-ink-900">{maskMobile(mobile)}</span>. There is no password to remember or
          leak.
        </Row>

        <Row icon={KeyRound} title="Keep your code private">
          Academy staff will never ask you for your code — not in person, on the phone, or over WhatsApp. Anyone asking
          for it is trying to access your account. A code is valid for five minutes and can only be used once.
        </Row>

        <Row icon={ShieldCheck} title="Changing your registered mobile number">
          Your mobile number is how we identify you, so it cannot be changed from here. Please visit the
          academy reception with photo identification and staff will update it for you.
        </Row>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-950">This device</h2>
        <p className="mt-1.5 text-sm leading-6 text-ink-600">
          You stay signed in on this device for up to two hours, after which a new code is required. Sign out if you are
          using a shared or public computer.
        </p>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-900 outline-none transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </section>
    </div>
  );
}
