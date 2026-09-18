export interface MemberBatch {
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  academyName?: string | null;
}

export interface MemberBatchResponse {
  batch: MemberBatch | null;
}

export type MemberBatchDisplayStatus = "Open" | "Closed" | null;

export function presentBatchStatus(status?: string | null): MemberBatchDisplayStatus {
  const normalized = status?.trim().toUpperCase();
  if (normalized === "OPEN") return "Open";
  if (normalized === "CLOSED") return "Closed";
  return null;
}

function timeMinutes(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || hour < (match[3] ? 1 : 0)) return null;
  if (match[3]) {
    hour %= 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
  }
  return hour * 60 + minute;
}

export function batchDuration(startTime?: string | null, endTime?: string | null) {
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  const minutes = end - start;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr ${remainder} min`;
}
