// Illustrated character avatars, used instead of stock photos of real people.
// Drawn as small inline SVGs, so they load instantly and work offline.

type Hair =
  | "capGoggles"      // swim cap, goggles pushed up on the forehead
  | "capGogglesOn"    // swim cap, goggles worn over the eyes
  | "sidePart"
  | "longGoggles"     // long hair with goggles resting on top of the head
  | "shortBeard"
  | "wavyBob"
  | "baldingGrey"
  | "greyBun"
  | "messyFringe";

type Outfit = "tee" | "polo" | "swimsuit" | "rashguard" | "kurta" | "cardigan" | "hoodie" | "henley";

interface Character {
  label: string;
  bg: [string, string];
  skin: string;
  skinShade: string;
  hair: string;
  hairShine: string;
  brow: string;
  outfit: Outfit;
  outfitColor: string;
  outfitShade: string;
  accent: string;       // cap / goggle strap / trim colour
  hairStyle: Hair;
  child?: boolean;
  feminine?: boolean;
  old?: boolean;
  glasses?: boolean;
  mustache?: boolean;
}

const INK = "#1e293b";

function body(c: Character, top: number): string {
  const w = c.child ? 19 : 23;
  const x0 = 32 - w, x1 = 32 + w;
  const torso = `<path d="M${x0} 70c0-${70 - top - 6} ${8} -${top > 48 ? 18 : 20} ${w} -${top > 48 ? 18 : 20}s${w} ${top > 48 ? 18 : 20} ${w} ${top > 48 ? 18 : 20}" fill="${c.outfitColor}"/>`;
  // simpler, stable torso shape
  const shape = `<path d="M${x0} 70V${top + 12}c0-6.5 5.5-${12 - 2} ${w - 4}-12h8c${w - 12} 0 ${w - 4} 5.5 ${w - 4} 12V70z" fill="${c.outfitColor}"/>`;
  const shade = `<path d="M${x0} 70V${top + 12}c0-3 1.2-5.6 3.2-7.6C${x0 + 4} ${top + 12} ${x0 + 5} ${top + 20} ${x0 + 5} 70z" fill="${c.outfitShade}" opacity=".55"/>`
    + `<path d="M${x1} 70V${top + 12}c0-3-1.2-5.6-3.2-7.6C${x1 - 4} ${top + 12} ${x1 - 5} ${top + 20} ${x1 - 5} 70z" fill="${c.outfitShade}" opacity=".55"/>`;
  void torso;
  let detail = "";
  switch (c.outfit) {
    case "tee":
      detail = `<path d="M26.5 ${top}c1.2 3.6 3 5.2 5.5 5.2s4.3-1.6 5.5-5.2" fill="none" stroke="${c.outfitShade}" stroke-width="1.6"/>`;
      break;
    case "polo":
      detail = `<path d="M26 ${top - 1}l6 6.5 6-6.5 2.2 5.4-5 2.6-3.2-1.4-3.2 1.4-5-2.6z" fill="#fff" opacity=".92"/>`
        + `<circle cx="32" cy="${top + 9}" r=".9" fill="${c.outfitShade}"/><circle cx="32" cy="${top + 12}" r=".9" fill="${c.outfitShade}"/>`;
      break;
    case "swimsuit":
      return `<path d="M${x0} 70V${top + 12}c0-6.5 5.5-10 ${w - 4}-12h8c${w - 12} 0 ${w - 4} 5.5 ${w - 4} 12V70z" fill="${c.skin}"/>`
        + `<path d="M${x0} 70V${top + 12}c0-3 1.2-5.6 3.2-7.6C${x0 + 4} ${top + 12} ${x0 + 5} ${top + 20} ${x0 + 5} 70z" fill="${c.skinShade}" opacity=".5"/>`
        + `<path d="M${x0 + 6} 70c0-8 1-13 3-16 2 3 6 5 ${32 - x0 - 9} 5s${32 - x0 - 12}-2 ${32 - x0 - 10}-5c2 3 3 8 3 16z" fill="${c.outfitColor}"/>`
        + `<path d="M${x0 + 8.4} ${top + 4.5}l1.8 13M${x1 - 8.4} ${top + 4.5}l-1.8 13" stroke="${c.outfitColor}" stroke-width="2.6" stroke-linecap="round"/>`
        + `<path d="M${x0 + 10} 62h${2 * (32 - x0 - 10)}" stroke="${c.accent}" stroke-width="1.6"/>`;
    case "rashguard":
      detail = `<path d="M27 ${top}c1 3 2.8 4.4 5 4.4s4-1.4 5-4.4" fill="none" stroke="${c.accent}" stroke-width="2"/>`
        + `<path d="M${x0 + 3} ${top + 10}l6 4M${x1 - 3} ${top + 10}l-6 4" stroke="${c.accent}" stroke-width="2.2" stroke-linecap="round"/>`;
      break;
    case "kurta":
      detail = `<path d="M28 ${top}c1 2.4 2.4 3.4 4 3.4s3-1 4-3.4" fill="none" stroke="${c.accent}" stroke-width="1.4"/>`
        + `<path d="M32 ${top + 3.4}v9" stroke="${c.accent}" stroke-width="1.4"/>`
        + `<circle cx="32" cy="${top + 6.4}" r=".8" fill="${c.accent}"/><circle cx="32" cy="${top + 9.4}" r=".8" fill="${c.accent}"/>`;
      break;
    case "cardigan":
      detail = `<path d="M27.5 ${top - 1}l4.5 12 4.5-12" fill="#f8fafc"/>`
        + `<path d="M27.5 ${top - 1}l4.5 12v18M36.5 ${top - 1}l-4.5 12" fill="none" stroke="${c.outfitShade}" stroke-width="1.3"/>`
        + `<circle cx="33.6" cy="${top + 15}" r=".9" fill="${c.accent}"/><circle cx="33.6" cy="${top + 19}" r=".9" fill="${c.accent}"/>`;
      break;
    case "hoodie":
      detail = `<path d="M23 ${top + 2}c2.5 5.5 5.6 8 9 8s6.5-2.5 9-8" fill="none" stroke="${c.outfitShade}" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M29.6 ${top + 8}v7M34.4 ${top + 8}v7" stroke="#f8fafc" stroke-width="1.1" stroke-linecap="round"/>`;
      break;
    case "henley":
      detail = `<path d="M27 ${top}c1.2 3 2.8 4.2 5 4.2s3.8-1.2 5-4.2" fill="none" stroke="${c.outfitShade}" stroke-width="1.5"/>`
        + `<path d="M32 ${top + 4}v7" stroke="${c.outfitShade}" stroke-width="1.2"/>`
        + `<circle cx="32" cy="${top + 6.5}" r=".75" fill="#f8fafc"/><circle cx="32" cy="${top + 9.5}" r=".75" fill="#f8fafc"/>`;
      break;
  }
  return shape + shade + detail;
}

function hairBehind(c: Character, cy: number): string {
  switch (c.hairStyle) {
    case "longGoggles":
      return `<path d="M18.6 ${cy}c-.6-10 5.6-16.2 13.4-16.2S46 ${cy - 10} 45.4 ${cy}l1.6 17.5c-2.6 1.4-5.2 1.4-7.4.6L38 ${cy + 4}H26l-1.6 ${13.5}c-2.2.8-4.8.8-7.4-.6z" fill="${c.hair}"/>`;
    case "wavyBob":
      return `<path d="M18.4 ${cy}c-.6-9.8 5.8-15.6 13.6-15.6S46.2 ${cy - 9.8} 45.6 ${cy}c1.6 3 1.8 6.4.4 9.2-1.6-1-3-1-4.4-.4L40.4 ${cy + 1}H23.6l-1.2 ${7.8}c-1.4-.6-2.8-.6-4.4.4-1.4-2.8-1.2-6.2.4-9.2z" fill="${c.hair}"/>`;
    case "greyBun":
      return `<circle cx="32" cy="${cy - 15.2}" r="5.4" fill="${c.hair}"/><path d="M29 ${cy - 16.4}q3-2 6 0" stroke="${c.hairShine}" stroke-width="1" fill="none"/>`;
    default:
      return "";
  }
}

function hairFront(c: Character, cy: number, r: number): string {
  const top = cy - r;
  switch (c.hairStyle) {
    case "capGoggles":
    case "capGogglesOn": {
      const cap = `<path d="M${32 - r - .6} ${cy + 1}c0-${r * .9} ${r * .44}-${r + 1.2} ${r + .6}-${r + 1.2}s${r + .6} ${r * .3} ${r + .6} ${r + 1.2}c-4.2-2.2-8.6-3.2-${r + .6}-3.2s-${r * .66} 1-${r + .6} 3.2z" fill="${c.hair}"/>`
        + `<path d="M${32 - r + 3} ${top + 7}c2.4-3.6 5.6-5.4 9-5.8" stroke="${c.hairShine}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
      if (c.hairStyle === "capGoggles") {
        const gy = top + 7.6;
        return cap
          + `<rect x="${32 - r - .8}" y="${gy - 1.3}" width="${2 * r + 1.6}" height="2.6" rx="1.3" fill="${c.accent}"/>`
          + goggleLens(27, gy, 3.6) + goggleLens(37, gy, 3.6)
          + `<path d="M30.4 ${gy}h3.2" stroke="${INK}" stroke-width="1.2"/>`;
      }
      return cap;
    }
    case "sidePart":
      return `<path d="M${32 - r} ${cy - 1}c-.4-${r * .8} 4.6-${r + 1.6} ${r + 1}-${r + 1.6}s${r + 1.2} ${r * .5} ${r - .6} ${r + .4}c-1.4-2.6-3.6-4.6-6.6-5.6-4.2 2.6-10.6 3.6-15.4 2.2-1.6 1.2-2.8 2.6-3.6 4z" fill="${c.hair}"/>`
        + `<path d="M27 ${top + 3.4}c3.4-1.6 8-1.8 11.4-.2" stroke="${c.hairShine}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>`;
    case "shortBeard":
      return `<path d="M${32 - r} ${cy - 1}c-.6-${r * .8} 4.4-${r + 1.4} ${r}-${r + 1.4}s${r + .6} ${r * .6} ${r} ${r + .4}c-2.6-3-6-4.6-${r}-4.6s-${r * .62} 1.6-${r} 4.6z" fill="${c.hair}"/>`
        + `<path d="M${32 - r + .4} ${cy + 2}c.4 8.6 5.2 13.4 ${r - .4} 13.4s${r - .8}-4.8 ${r - .4}-13.4c-1.2 3.6-3.8 5.4-6.6 5.4-1.6-1.6-3.6-2.2-5.4-2.2s-3.8.6-5.4 2.2c-2.8 0-5.4-1.8-6.6-5.4z" fill="${c.hair}"/>`;
    case "longGoggles": {
      const gy = top + 2.6;
      return `<path d="M${32 - r} ${cy - .5}c.6-${r * .76} 5.8-${r + .8} ${r}-${r + .8}s${r - .6} ${r * .56} ${r} ${r + .8}c-3.4-3.8-7.6-5.2-11-5.4-3.6 1.6-8.2 2.8-11.6 2.4z" fill="${c.hair}"/>`
        + `<path d="M24.6 ${top + 4.6}c2.2-1.8 4.6-2.6 7-2.8" stroke="${c.hairShine}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>`
        + `<path d="M${32 - r - 1} ${gy + 2.4}c4-3.2 8.6-4.6 ${r + 1}-4.6s9 1.4 ${r + 1} 4.6" stroke="${c.accent}" stroke-width="2.4" fill="none"/>`
        + goggleLens(27.4, gy, 3.3) + goggleLens(36.6, gy, 3.3)
        + `<path d="M30.7 ${gy}h2.6" stroke="${INK}" stroke-width="1.1"/>`;
    }
    case "wavyBob":
      return `<path d="M${32 - r} ${cy - .4}c.4-${r * .8} 5.6-${r + .8} ${r}-${r + .8}s${r - .4} ${r * .6} ${r} ${r + .8}c-1.6-1.8-3.6-3-5.6-3.6-1.4 1.8-3.6 2.8-5.8 2.8-2 0-4-1.2-5.2-2.8-3.2.6-5.6 2-6.4 3.6z" fill="${c.hair}"/>`
        + `<path d="M35 ${top + 3}c2.4.4 4.4 1.6 5.6 3.4" stroke="${c.hairShine}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>`;
    case "baldingGrey":
      return `<path d="M${32 - r - .4} ${cy + 1.6}c-.8-4.4.2-8 2.6-10.4.8 2.4 1.8 4.2 3.4 5.4-1.6 1.4-3.6 3-6 5z" fill="${c.hair}"/>`
        + `<path d="M${32 + r + .4} ${cy + 1.6}c.8-4.4-.2-8-2.6-10.4-.8 2.4-1.8 4.2-3.4 5.4 1.6 1.4 3.6 3 6 5z" fill="${c.hair}"/>`
        + `<path d="M27.6 ${top + 3}c2.4-1 5.4-1.2 8 0" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".35"/>`;
    case "greyBun":
      return `<path d="M${32 - r} ${cy}c-.4-${r * .8} 5-${r + 1.4} ${r}-${r + 1.4}s${r + .4} ${r * .6} ${r} ${r + 1.4}c-2-2.6-4.6-4.2-7.4-4.8-.8 1-1.6 1.6-2.6 1.6s-1.8-.6-2.6-1.6c-2.8.6-5.4 2.2-7.4 4.8z" fill="${c.hair}"/>`
        + `<path d="M26.4 ${top + 4.4}c1.6-1.4 3.4-2.2 5.2-2.4M37.6 ${top + 4.4}c-1.6-1.4-3.4-2.2-5.2-2.4" stroke="${c.hairShine}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    case "messyFringe":
      return `<path d="M${32 - r - .6} ${cy}c-1-${r * .9} 4.6-${r + 2.2} ${r + .6}-${r + 2.2}s${r + 1.6} ${r * .7} ${r + .6} ${r + 2.2}c-1-1.4-2-2.4-3.2-3l-.6 3-2.6-3.6-1.6 3.4-2.4-3.8-2 3.6-2.4-3.2-1.4 3.2c-2.2-.2-4 .8-5.6 3.2z" fill="${c.hair}"/>`
        + `<path d="M28 ${top + 1.4}c2.6-1.2 6-1.2 8.4 0" stroke="${c.hairShine}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>`;
  }
}

function goggleLens(x: number, y: number, r: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .82}" fill="#7dd3fc" stroke="${INK}" stroke-width="1.3"/>`
    + `<path d="M${x - r * .45} ${y - r * .25}q${r * .3}-${r * .35} ${r * .7}-${r * .3}" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
}

function face(c: Character, cy: number, r: number): string {
  const ey = cy + (c.child ? 1.6 : 1);
  const ex = c.child ? 4.6 : 4.8;
  const parts: string[] = [];
  // ears
  parts.push(`<ellipse cx="${32 - r}" cy="${cy + 2}" rx="2.4" ry="3" fill="${c.skin}"/><ellipse cx="${32 + r}" cy="${cy + 2}" rx="2.4" ry="3" fill="${c.skin}"/>`);
  parts.push(`<path d="M${32 - r - .4} ${cy + .6}q-1 1.4 0 2.8M${32 + r + .4} ${cy + .6}q1 1.4 0 2.8" stroke="${c.skinShade}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);
  // head
  parts.push(`<ellipse cx="32" cy="${cy}" rx="${r}" ry="${r + (c.child ? .2 : 1.2)}" fill="${c.skin}"/>`);
  parts.push(`<path d="M${32 - r + 1.4} ${cy + 5}c2.4 6.4 6.6 ${c.child ? 8.6 : 9.6} ${r - 1.4} ${c.child ? 8.6 : 9.6}s8.2-3.2 ${r - 1.4}-${c.child ? 8.6 : 9.6}c-3 3.6-7.2 5.2-${r - 1.4} 5.2s-8-1.6-${r - 1.4}-5.2z" fill="${c.skinShade}" opacity=".2"/>`);
  // cheeks
  parts.push(`<ellipse cx="${32 - ex - 1.4}" cy="${ey + 4.4}" rx="2.3" ry="1.5" fill="#fb7185" opacity="${c.feminine || c.child ? .3 : .16}"/><ellipse cx="${32 + ex + 1.4}" cy="${ey + 4.4}" rx="2.3" ry="1.5" fill="#fb7185" opacity="${c.feminine || c.child ? .3 : .16}"/>`);

  const gogglesOn = c.hairStyle === "capGogglesOn";
  // eyes
  const eye = (x: number) => `<ellipse cx="${x}" cy="${ey}" rx="${c.child ? 1.7 : 1.5}" ry="${c.child ? 2 : 1.8}" fill="${INK}"/><circle cx="${x + .55}" cy="${ey - .7}" r=".55" fill="#fff"/>`;
  parts.push(eye(32 - ex) + eye(32 + ex));
  if (c.feminine && !c.child) {
    parts.push(`<path d="M${32 - ex - 1.6} ${ey - 1.2}l-1 -.8M${32 + ex + 1.6} ${ey - 1.2}l1 -.8" stroke="${INK}" stroke-width=".8" stroke-linecap="round"/>`);
  }
  // brows (hidden under goggles strap when worn)
  if (!gogglesOn) {
    const by = ey - (c.child ? 3.6 : 3.4);
    const w = c.feminine ? 1.1 : 1.5;
    parts.push(`<path d="M${32 - ex - 2} ${by + .4}q2-${c.old ? .4 : 1.2} 4 0M${32 + ex - 2} ${by + .4}q2-${c.old ? .4 : 1.2} 4 0" stroke="${c.brow}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`);
  }
  // nose
  parts.push(`<path d="M32.4 ${ey + 1.4}q1.2 2.4-.4 3.2" stroke="${c.skinShade}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`);
  // mouth
  const my = ey + (c.child ? 5.6 : 6.2);
  if (c.feminine && !c.child) {
    parts.push(`<path d="M29 ${my}q3 2.8 6 0q-3 .8-6 0z" fill="#e11d48" opacity=".85"/>`);
  } else if (!c.mustache) {
    parts.push(`<path d="M29.2 ${my}q2.8 2.6 5.6 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
  }
  if (c.mustache) {
    parts.push(`<path d="M27.6 ${my - .4}c1.6-1.8 3-2 4.4-1 1.4-1 2.8-.8 4.4 1-1.6.6-3 .6-4.4-.2-1.4.8-2.8.8-4.4.2z" fill="${c.hair}"/>`);
    parts.push(`<path d="M30 ${my + 1.4}q2 1.2 4 0" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`);
  }
  // age lines
  if (c.old) {
    parts.push(`<path d="M${32 - ex - 2.6} ${ey + .4}l-1.2 .6M${32 - ex - 2.6} ${ey + 1.6}l-1.2-.2M${32 + ex + 2.6} ${ey + .4}l1.2 .6M${32 + ex + 2.6} ${ey + 1.6}l1.2-.2" stroke="${c.skinShade}" stroke-width=".7" stroke-linecap="round"/>`);
    parts.push(`<path d="M28.6 ${cy - r + 4.6}q3.4-1 6.8 0M29.4 ${cy - r + 6.4}q2.6-.7 5.2 0" stroke="${c.skinShade}" stroke-width=".7" fill="none" stroke-linecap="round"/>`);
    parts.push(`<path d="M27.6 ${my - 1.8}q-.8 1.4 0 2.6M36.4 ${my - 1.8}q.8 1.4 0 2.6" stroke="${c.skinShade}" stroke-width=".7" fill="none" stroke-linecap="round"/>`);
  }
  // glasses
  if (c.glasses) {
    parts.push(`<circle cx="${32 - ex}" cy="${ey}" r="3.1" fill="#fff" fill-opacity=".18" stroke="${c.accent}" stroke-width="1.1"/><circle cx="${32 + ex}" cy="${ey}" r="3.1" fill="#fff" fill-opacity=".18" stroke="${c.accent}" stroke-width="1.1"/>`
      + `<path d="M${32 - ex + 3.1} ${ey - .4}q${ex - 3.1} -1.2 ${2 * (ex - 3.1)} 0M${32 - ex - 3.1} ${ey - .6}l-${r - ex - 3.4} -1M${32 + ex + 3.1} ${ey - .6}l${r - ex - 3.4} -1" stroke="${c.accent}" stroke-width="1" fill="none"/>`);
  }
  // goggles worn over the eyes
  if (gogglesOn) {
    parts.push(`<rect x="${32 - r - .6}" y="${ey - 1.4}" width="${2 * r + 1.2}" height="2.8" rx="1.4" fill="${c.accent}"/>`);
    for (const x of [32 - ex, 32 + ex]) {
      parts.push(`<ellipse cx="${x}" cy="${ey}" rx="3.9" ry="3.2" fill="#38bdf8" fill-opacity=".55" stroke="${INK}" stroke-width="1.4"/>`
        + `<path d="M${x - 2} ${ey - 1.2}q1.2-1.2 2.8-1.1" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round"/>`);
    }
    parts.push(`<path d="M${32 - ex + 3.9} ${ey}h${2 * (ex - 3.9)}" stroke="${INK}" stroke-width="1.3"/>`);
  }
  return parts.join("");
}

function characterSvg(c: Character, id: number): string {
  const r = c.child ? 13 : 12;
  const cy = c.child ? 31 : 28.5;
  const neckTop = cy + r - 2;
  const shoulders = c.child ? 49 : 47;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 6 56 56">`
    + `<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></linearGradient></defs>`
    + `<rect x="0" y="0" width="64" height="70" fill="url(#bg${id})"/>`
    + `<circle cx="50" cy="15" r="9" fill="#fff" opacity=".22"/>`
    + hairBehind(c, cy)
    + `<path d="M27.6 ${neckTop}h8.8v${shoulders - neckTop + 3}c-2.6 2-6.2 2-8.8 0z" fill="${c.skin}"/>`
    + `<path d="M27.6 ${neckTop}h8.8v3.6c-2.8 1.6-6 1.6-8.8 0z" fill="${c.skinShade}" opacity=".5"/>`
    + body(c, shoulders)
    + face(c, cy, r)
    + hairFront(c, cy, r)
    + `</svg>`;
}

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const CHARACTERS: Character[] = [
  { label: "Girl with goggles", bg: ["#fdf2f8", "#fbcfe8"], skin: "#f5cfae", skinShade: "#d9a27c", hair: "#ec4899", hairShine: "#fbcfe8", brow: "#5b3a29",
    outfit: "rashguard", outfitColor: "#8b5cf6", outfitShade: "#6d28d9", accent: "#f9a8d4", hairStyle: "capGoggles", child: true, feminine: true },
  { label: "Boy with goggles", bg: ["#e0f2fe", "#bae6fd"], skin: "#c98d63", skinShade: "#a56a45", hair: "#0284c7", hairShine: "#7dd3fc", brow: "#2b1d16",
    outfit: "rashguard", outfitColor: "#f97316", outfitShade: "#c2410c", accent: "#1e293b", hairStyle: "capGogglesOn", child: true },
  { label: "Man", bg: ["#ecfeff", "#a5f3fc"], skin: "#e0aa7e", skinShade: "#be855a", hair: "#2b1d16", hairShine: "#6b4a37", brow: "#2b1d16",
    outfit: "polo", outfitColor: "#0f766e", outfitShade: "#115e59", accent: "#fff", hairStyle: "sidePart" },
  { label: "Woman with goggles", bg: ["#fff7ed", "#fed7aa"], skin: "#d9a07a", skinShade: "#b97c56", hair: "#3b2416", hairShine: "#7a4f37", brow: "#2b1d16",
    outfit: "rashguard", outfitColor: "#0ea5e9", outfitShade: "#0369a1", accent: "#e11d48", hairStyle: "longGoggles", feminine: true },
  { label: "Man with beard", bg: ["#f5f3ff", "#ddd6fe"], skin: "#8d5a3b", skinShade: "#6b3f26", hair: "#18120e", hairShine: "#4b3a30", brow: "#18120e",
    outfit: "henley", outfitColor: "#334155", outfitShade: "#1e293b", accent: "#f8fafc", hairStyle: "shortBeard" },
  { label: "Woman", bg: ["#f0fdf4", "#bbf7d0"], skin: "#f3c9a6", skinShade: "#d8a47e", hair: "#6b3518", hairShine: "#a8603a", brow: "#4a2512",
    outfit: "kurta", outfitColor: "#db2777", outfitShade: "#9d174d", accent: "#fde68a", hairStyle: "wavyBob", feminine: true },
  { label: "Older man", bg: ["#eff6ff", "#93c5fd"], skin: "#d6a07a", skinShade: "#b47d58", hair: "#e2e8f0", hairShine: "#ffffff", brow: "#e2e8f0",
    outfit: "kurta", outfitColor: "#f5e6c8", outfitShade: "#d6bf94", accent: "#475569", hairStyle: "baldingGrey", old: true, glasses: true, mustache: true },
  { label: "Older woman", bg: ["#fefce8", "#fde68a"], skin: "#e9b892", skinShade: "#c9906a", hair: "#d1d5db", hairShine: "#f8fafc", brow: "#9ca3af",
    outfit: "cardigan", outfitColor: "#9f1239", outfitShade: "#881337", accent: "#fbbf24", hairStyle: "greyBun", feminine: true, old: true, glasses: true },
  { label: "Teenager", bg: ["#eef2ff", "#c7d2fe"], skin: "#f0c39c", skinShade: "#d29d75", hair: "#1c1917", hairShine: "#57534e", brow: "#1c1917",
    outfit: "hoodie", outfitColor: "#4f46e5", outfitShade: "#3730a3", accent: "#fff", hairStyle: "messyFringe" },
];

export const CHARACTER_AVATARS: string[] = CHARACTERS.map((c, i) => toDataUri(characterSvg(c, i)));
export const CHARACTER_AVATAR_LABELS: string[] = CHARACTERS.map((c) => c.label);

// Shown when someone has no photo yet.
export const DEFAULT_AVATAR = CHARACTER_AVATARS[2];
