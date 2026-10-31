import { BatchRepository } from "../repositories/batch.repository";
import { validateBatchInput } from "../utils/batch-operations";

/** A batch as Batch Management shows it: times, capacity and live active-member count. */
export function toOperationalBatch(row: any) {
  const capacity = Number(row.capacity || 0);
  const activeMemberCount = Number(row.active_member_count || 0);
  return {
    id: Number(row.id),
    batchName: String(row.batch_name),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    capacity,
    status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
    activeMemberCount,
    availableSeats: Math.max(0, capacity - activeMemberCount)
  };
}

export class BatchService {
  constructor(private batchRepository: any = new BatchRepository()) {}

  async getOperationalBatches(academyId: string) {
    const rows = await this.batchRepository.getOperationalByAcademy(academyId);
    return (rows || []).map(toOperationalBatch);
  }

  async getAllBatches(): Promise<any[]> {
    return this.batchRepository.getAll();
  }

  async getBatchById(id: number | string): Promise<any | null> {
    return this.batchRepository.getById(id);
  }

  /** Creates a batch for the signed-in user's academy; ownership and member counts are never taken from the request. */
  async createBatch(academyId: string, payload: any) {
    return this.batchRepository.createOperational(academyId, validateBatchInput(payload));
  }

  async updateBatch(id: number | string, academyId: string, payload: any) {
    return this.batchRepository.updateOperational(Number(id), academyId, validateBatchInput(payload));
  }

  async deleteBatch(id: number | string, academyId: string) {
    return this.batchRepository.deleteOperational(Number(id), academyId);
  }
}
