export type BatchStatus = "OPEN" | "CLOSED";

export interface ValidatedBatchInput {
  batchName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: BatchStatus;
  confirmOverlap: boolean;
}

export interface ComparableBatch {
  id: number | string;
  batch_name: string;
  start_time: string;
  end_time: string;
}

export class BatchOperationError extends Error {
  constructor(message: string, public status: number, public code: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "BatchOperationError";
  }
}

export function normalizeBatchTime(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
  const twentyFourHour = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  let hour: number;
  let minute: number;
  if (twelveHour) {
    hour = Number(twelveHour[1]);
    minute = Number(twelveHour[2]);
    if (hour < 1 || hour > 12 || minute > 59) throw new BatchOperationError("Time must use a valid HH:MM value.", 400, "INVALID_BATCH_TIME");
    hour = hour % 12 + (twelveHour[3] === "PM" ? 12 : 0);
  } else if (twentyFourHour) {
    hour = Number(twentyFourHour[1]);
    minute = Number(twentyFourHour[2]);
    if (hour > 23 || minute > 59) throw new BatchOperationError("Time must use a valid HH:MM value.", 400, "INVALID_BATCH_TIME");
  } else {
    throw new BatchOperationError("Time must use a valid HH:MM value.", 400, "INVALID_BATCH_TIME");
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function validateBatchInput(payload: any): ValidatedBatchInput {
  const batchName = String(payload?.batchName ?? payload?.batch_name ?? "").trim().replace(/\s+/g, " ");
  if (!batchName) throw new BatchOperationError("Batch name is required.", 400, "INVALID_BATCH_NAME");
  if (batchName.length > 100) throw new BatchOperationError("Batch name must be 100 characters or fewer.", 400, "INVALID_BATCH_NAME");
  const startTime = normalizeBatchTime(payload?.startTime ?? payload?.start_time);
  const endTime = normalizeBatchTime(payload?.endTime ?? payload?.end_time);
  if (startTime >= endTime) throw new BatchOperationError("Start time must be before end time.", 400, "INVALID_TIME_RANGE");
  const capacity = Number(payload?.capacity);
  if (!Number.isInteger(capacity) || capacity <= 0) throw new BatchOperationError("Capacity must be a positive whole number.", 400, "INVALID_BATCH_CAPACITY");
  const status = String(payload?.status ?? "OPEN").toUpperCase();
  if (status !== "OPEN" && status !== "CLOSED") throw new BatchOperationError("Status must be OPEN or CLOSED.", 400, "INVALID_BATCH_STATUS");
  return { batchName, startTime, endTime, capacity, status, confirmOverlap: payload?.confirmOverlap === true };
}

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}

export function findBatchConflicts(existing: ComparableBatch[], candidate: ValidatedBatchInput, excludedId?: number) {
  let duplicate: ComparableBatch | undefined;
  const overlaps: ComparableBatch[] = [];
  for (const batch of existing) {
    if (excludedId !== undefined && Number(batch.id) === excludedId) continue;
    let startTime: string;
    let endTime: string;
    try {
      startTime = normalizeBatchTime(batch.start_time);
      endTime = normalizeBatchTime(batch.end_time);
    } catch {
      continue;
    }
    if (normalizedName(batch.batch_name) === normalizedName(candidate.batchName) && startTime === candidate.startTime && endTime === candidate.endTime) {
      duplicate = batch;
      continue;
    }
    if (candidate.startTime < endTime && candidate.endTime > startTime) overlaps.push(batch);
  }
  return { duplicate, overlaps };
}
