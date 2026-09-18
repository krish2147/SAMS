export interface MemberCalendarEvent {
  title: string;
  description?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  eventType?: string | null;
  registrationRequired?: boolean;
}

export interface MemberCalendarHoliday {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  facilityClosed?: boolean;
}

function dateParts(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

export function formatCalendarDate(value?: string | null) {
  const date = dateParts(value);
  return date ? new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date) : null;
}

export function calendarDateBadge(value?: string | null) {
  const date = dateParts(value);
  if (!date) return null;
  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(date),
    day: new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: "UTC" }).format(date)
  };
}

export function formatCalendarTime(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export function eventTimeRange(start?: string | null, end?: string | null) {
  if (start?.startsWith("00:00") && end?.startsWith("23:59")) return null;
  const formattedStart = formatCalendarTime(start);
  const formattedEnd = formatCalendarTime(end);
  if (formattedStart && formattedEnd) return `${formattedStart} – ${formattedEnd}`;
  return formattedStart || formattedEnd;
}
