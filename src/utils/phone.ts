export type NormalizedIndianMobile = { national: string; international: string; masked: string };

export function normalizeIndianMobile(value: unknown): NormalizedIndianMobile {
  let digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  while (digits.startsWith("9191") && digits.length > 12) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
    throw Object.assign(new Error("Enter a valid Indian mobile number."), { status: 400, code: "INVALID_PHONE" });
  }
  return { national: digits, international: `91${digits}`, masked: `+91 ******${digits.slice(-4)}` };
}

// For phone boxes while typing or pasting: "08401829027", "+91 84018 29027" and "918401829027"
// all become "8401829027". The boxes used to keep the first ten digits, so a leading 0 pushed the
// last digit off and saved a wrong number.
export function mobileDigits(value: string): string {
  let d = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2).replace(/^0+/, "");
  return d.slice(0, 10);
}
