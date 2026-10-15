// Illustrated character avatars, used instead of stock photos of real people.
// Drawn as small inline SVGs, so they load instantly and work offline.

type HairStyle = "short" | "long" | "bun" | "cap" | "curly" | "beard" | "spiky" | "bob";

interface Character {
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  style: HairStyle;
}

const INK = "#1f2937";

function hairBack(c: Character): string {
  if (c.style === "long") return `<path d="M17 29c0-11 6.5-17 15-17s15 6 15 17v15h-6V31H23v13h-6z" fill="${c.hair}"/>`;
  if (c.style === "bob") return `<path d="M17.5 30c0-10.5 6.3-16.5 14.5-16.5S46.5 19.5 46.5 30v7h-5v-6h-19v6h-5z" fill="${c.hair}"/>`;
  return "";
}

function hairFront(c: Character): string {
  switch (c.style) {
    case "short":
      return `<path d="M18.6 27.5c0-9.2 6-14.5 13.4-14.5s13.4 5.3 13.4 14.5c-2.2-4.3-5.6-6.8-9.6-6.8h-7.6c-4 0-7.4 2.5-9.6 6.8z" fill="${c.hair}"/>`;
    case "spiky":
      return `<path d="M18.6 27.5c0-6 2-10 5-12l1 2 2-4 2 3 3-5 2 4 3-3 1 4 3-1c2.4 2.6 3.8 6.6 3.8 12-2.2-4.3-5.6-6.8-9.6-6.8h-7.6c-4 0-7.4 2.5-9.6 6.8z" fill="${c.hair}"/>`;
    case "long":
    case "bob":
      return `<path d="M18.7 27c1-8.4 6.4-13 13.3-13s12.3 4.6 13.3 13c-3.6-3.6-8-5.6-13.3-5.6-5.3 0-9.7 2-13.3 5.6z" fill="${c.hair}"/>`;
    case "bun":
      return `<circle cx="32" cy="13.4" r="4.8" fill="${c.hair}"/><path d="M18.7 27c1-8.4 6.4-13 13.3-13s12.3 4.6 13.3 13c-3.6-3.6-8-5.6-13.3-5.6-5.3 0-9.7 2-13.3 5.6z" fill="${c.hair}"/>`;
    case "curly":
      return [[21, 21], [25, 16.5], [31, 14.5], [37, 15.5], [42, 19.5], [44.5, 25], [19.5, 26]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c.hair}"/>`).join("");
    case "beard":
      return `<path d="M18.6 27.5c0-9.2 6-14.5 13.4-14.5s13.4 5.3 13.4 14.5c-2.2-4.3-5.6-6.8-9.6-6.8h-7.6c-4 0-7.4 2.5-9.6 6.8z" fill="${c.hair}"/><path d="M20 31c.8 7.2 5.4 10.6 12 10.6S43.2 38.2 44 31c-2.4 2.8-6.4 3.9-12 3.9S22.4 33.8 20 31z" fill="${c.hair}"/>`;
    case "cap":
      // Swim cap with goggles pushed up on the forehead.
      return `<path d="M18.4 28c0-9.6 6.2-15.6 13.6-15.6S45.6 18.4 45.6 28z" fill="${c.hair}"/>`
        + `<rect x="18.6" y="22.6" width="26.8" height="2.6" rx="1.3" fill="${INK}" opacity=".75"/>`
        + `<circle cx="26.6" cy="23.9" r="3.3" fill="#bae6fd" stroke="${INK}" stroke-width="1.2"/>`
        + `<circle cx="37.4" cy="23.9" r="3.3" fill="#bae6fd" stroke="${INK}" stroke-width="1.2"/>`;
  }
}

function characterSvg(c: Character): string {
  const mouth = c.style === "beard"
    ? `<path d="M28.6 35.2q3.4 2.2 6.8 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M27.8 34.4q4.2 3.4 8.4 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3.5 8.5 57 57">`
    + `<rect y="0" width="64" height="70" fill="${c.bg}"/>`
    + hairBack(c)
    + `<path d="M9 66c0-13 10.3-21 23-21s23 8 23 21z" fill="${c.shirt}"/>`
    + `<rect x="27.5" y="36" width="9" height="10" rx="3" fill="${c.skin}"/>`
    + `<rect x="27.5" y="38" width="9" height="3" fill="#000" opacity=".08"/>`
    + `<circle cx="19.4" cy="29.5" r="2.7" fill="${c.skin}"/><circle cx="44.6" cy="29.5" r="2.7" fill="${c.skin}"/>`
    + `<circle cx="32" cy="28" r="13" fill="${c.skin}"/>`
    + `<circle cx="25.4" cy="32.6" r="2.2" fill="#f472b6" opacity=".22"/><circle cx="38.6" cy="32.6" r="2.2" fill="#f472b6" opacity=".22"/>`
    + `<circle cx="27.2" cy="29" r="1.6" fill="${INK}"/><circle cx="36.8" cy="29" r="1.6" fill="${INK}"/>`
    + mouth
    + hairFront(c)
    + `</svg>`;
}

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const CHARACTERS: Character[] = [
  { bg: "#e0f2fe", skin: "#f1c7a0", hair: "#0ea5e9", shirt: "#0369a1", style: "cap" },
  { bg: "#fef3c7", skin: "#c68863", hair: "#2b1d16", shirt: "#f59e0b", style: "long" },
  { bg: "#dcfce7", skin: "#8d5a3b", hair: "#1c1917", shirt: "#16a34a", style: "short" },
  { bg: "#fce7f3", skin: "#f3d0b5", hair: "#6b3f23", shirt: "#db2777", style: "bun" },
  { bg: "#ede9fe", skin: "#d39b72", hair: "#1f1a17", shirt: "#7c3aed", style: "beard" },
  { bg: "#ffedd5", skin: "#6f4430", hair: "#111827", shirt: "#ea580c", style: "curly" },
  { bg: "#cffafe", skin: "#e7b48f", hair: "#f43f5e", shirt: "#0891b2", style: "cap" },
  { bg: "#e2e8f0", skin: "#b9774f", hair: "#3f2a1d", shirt: "#334155", style: "bob" },
  { bg: "#ecfccb", skin: "#f0c39c", hair: "#3b2416", shirt: "#65a30d", style: "spiky" },
];

export const CHARACTER_AVATARS: string[] = CHARACTERS.map((c) => toDataUri(characterSvg(c)));

// Shown when someone has no photo yet.
export const DEFAULT_AVATAR = CHARACTER_AVATARS[0];
