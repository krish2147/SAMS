import React from "react";

function getInitials(name: string) {
  const parts = name.replace(/\s*\(Member\)\s*/gi, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function getMemberFirstName(name: string) {
  return name.replace(/\s*\(Member\)\s*/gi, " ").trim().split(/\s+/)[0] || "Member";
}

export function MemberAvatar({ avatar, userName, className }: { avatar?: string; userName: string; className: string }) {
  if (avatar) return <img src={avatar} alt={`${userName} profile`} className={`${className} object-cover`} />;
  return (
    <span className={`${className} inline-flex items-center justify-center bg-cyan-50 font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-200`} aria-label={`${userName} initials`}>
      {getInitials(userName)}
    </span>
  );
}
