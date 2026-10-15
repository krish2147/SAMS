// Dashboard accent colour. The choice is applied by putting data-accent on <html>; the
// matching palettes live in src/index.css. It is remembered on this device.
export const ACCENTS = [
  { id: "ocean", label: "Aqua", swatch: "#16a9c4" },
  { id: "teal", label: "Teal", swatch: "#14b8a6" },
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
const KEY = "sams_accent";

export function getAccent(): AccentId {
  try {
    const saved = localStorage.getItem(KEY);
    if (ACCENTS.some((a) => a.id === saved)) return saved as AccentId;
  } catch { /* storage blocked: use the default */ }
  return "ocean";
}

export function applyAccent(id: AccentId) {
  const root = document.documentElement;
  if (id === "ocean") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", id);
}

export function saveAccent(id: AccentId) {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  applyAccent(id);
}
