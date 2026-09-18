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
