export type DateOnlyInput = string | Date;

type CalendarDuration =
  | { durationMonths: number; durationDays?: never }
  | { durationMonths?: never; durationDays: number };

type DateParts = { year: number; month: number; day: number };

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validParts(year: number, month: number, day: number): DateParts | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function partsFromInput(value: DateOnlyInput): DateParts | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // MySQL DATE values are constructed at local midnight by mysql2. Local
    // getters preserve that business date instead of shifting it through UTC.
    return validParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return validParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const indian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (indian) return validParts(Number(indian[3]), Number(indian[2]), Number(indian[1]));

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return validParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function formatParts(parts: DateParts) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function requiredDate(value: DateOnlyInput, field: string) {
  const parts = partsFromInput(value);
  if (!parts) throw new Error(`${field} must be a valid calendar date.`);
  return parts;
}

export function toDateOnlyString(value: DateOnlyInput | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parts = partsFromInput(value);
  return parts ? formatParts(parts) : null;
}

/** Formats an existing business date without reparsing an ISO date at UTC. */
export function formatDateOnlyForWhatsApp(value: DateOnlyInput | null | undefined): string {
  const dateOnly = toDateOnlyString(value);
  if (!dateOnly) throw new Error("WhatsApp membership date must be a valid stored calendar date.");
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

export function calendarToday(now: Date = new Date()) {
  return formatParts(requiredDate(now, "Current date"));
}

export function addCalendarDays(value: DateOnlyInput, days: number) {
  const parts = requiredDate(value, "Start date");
  if (!Number.isInteger(days)) throw new Error("Calendar-day adjustment must be an integer.");
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatParts({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

export function addCalendarMonthsClamped(value: DateOnlyInput, months: number) {
  const parts = requiredDate(value, "Start date");
  if (!Number.isInteger(months)) throw new Error("Calendar-month duration must be an integer.");
  const monthIndex = parts.month - 1 + months;
  const targetYear = parts.year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;
  return formatParts({
    year: targetYear,
    month: targetMonth,
    day: Math.min(parts.day, daysInMonth(targetYear, targetMonth))
  });
}

export function calculateMembershipPeriod(startDate: DateOnlyInput, duration: CalendarDuration) {
  const startDateStr = formatParts(requiredDate(startDate, "Membership start date"));
  let exclusiveEnd: string;
  if (duration.durationMonths !== undefined) {
    if (!Number.isInteger(duration.durationMonths) || duration.durationMonths <= 0) {
      throw new Error("Membership duration in months must be a positive integer.");
    }
    exclusiveEnd = addCalendarMonthsClamped(startDateStr, duration.durationMonths);
  } else {
    if (!Number.isInteger(duration.durationDays) || duration.durationDays <= 0) {
      throw new Error("Membership duration in days must be a positive integer.");
    }
    exclusiveEnd = addCalendarDays(startDateStr, duration.durationDays);
  }
  return { startDateStr, expiryDateStr: addCalendarDays(exclusiveEnd, -1) };
}

export function calculateActivationMembershipPeriod(input: {
  activationDate?: DateOnlyInput;
  currentExpiry?: DateOnlyInput | null;
} & CalendarDuration) {
  const activationDate = toDateOnlyString(input.activationDate || calendarToday());
  if (!activationDate) throw new Error("Activation date must be a valid calendar date.");
  const currentExpiry = toDateOnlyString(input.currentExpiry);
  const startDate = currentExpiry && currentExpiry >= activationDate
    ? addCalendarDays(currentExpiry, 1)
    : activationDate;
  return input.durationMonths !== undefined
    ? calculateMembershipPeriod(startDate, { durationMonths: input.durationMonths })
    : calculateMembershipPeriod(startDate, { durationDays: input.durationDays });
}

export function calendarDaysBetween(from: DateOnlyInput, to: DateOnlyInput) {
  const left = requiredDate(from, "Start date");
  const right = requiredDate(to, "End date");
  const leftTime = Date.UTC(left.year, left.month - 1, left.day);
  const rightTime = Date.UTC(right.year, right.month - 1, right.day);
  return Math.round((rightTime - leftTime) / 86_400_000);
}
