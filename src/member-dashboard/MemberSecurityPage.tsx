import React, { useEffect, useState } from "react";
import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Smartphone } from "lucide-react";
import { SettingsGroup, SettingsRow, SettingsTitle } from "../components/SettingsList";

/** Shows only the last four digits, so the page is safe to read over someone's shoulder. */
function maskMobile(value?: string) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 4) return "your registered mobile number";
  const last4 = digits.slice(-4);
  return `+91 ••••• •${last4}`;
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
    <div className="mx-auto max-w-xl pb-6">
      <SettingsTitle>Security</SettingsTitle>

      <SettingsGroup heading="Signing in">
        <SettingsRow
          icon={Smartphone}
          title="How you sign in"
          subtitle={<>A six-digit code is sent by SMS to <span className="font-semibold text-slate-800">{maskMobile(mobile)}</span> each time. There is no password to remember.</>}
        />
        <SettingsRow
          icon={KeyRound}
          title="Keep your code private"
          subtitle="Academy staff will never ask for your code, in person, on the phone or on WhatsApp. A code works once and only for five minutes."
        />
        <SettingsRow
          icon={ShieldCheck}
          title="Change your mobile number"
          subtitle="Visit the academy reception with photo identification and staff will update it for you."
        />
      </SettingsGroup>

      <SettingsGroup heading="This device">
        <SettingsRow
          icon={MonitorSmartphone}
          title="Staying signed in"
          subtitle="On the website you stay signed in until you close the browser. In the installed app, tick Keep me logged in to stay signed in for up to 30 days."
        />
      </SettingsGroup>

      {onLogout && (
        <SettingsGroup>
          <SettingsRow icon={LogOut} title="Log out" danger onClick={onLogout} />
        </SettingsGroup>
      )}
    </div>
  );
}
