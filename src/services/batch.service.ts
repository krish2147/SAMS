import { BatchRepository } from "../repositories/batch.repository";

export class BatchService {
  private batchRepository = new BatchRepository();

  async getAllBatches(): Promise<any[]> {
    return this.batchRepository.getAll();
  }

  async getBatchById(id: number | string): Promise<any | null> {
    return this.batchRepository.getById(id);
  }

  async createBatch(batchData: any): Promise<any> {
    if (!batchData.batch_name || !batchData.batch_name.trim()) {
      throw new Error("Batch name is required");
    }
    if (!batchData.start_time || !batchData.start_time.trim()) {
      throw new Error("Start time is required");
    }
    if (!batchData.end_time || !batchData.end_time.trim()) {
      throw new Error("End time is required");
    }
    if (!batchData.capacity || isNaN(Number(batchData.capacity))) {
      throw new Error("Batch capacity must be a valid number");
    }
    
    return this.batchRepository.create(batchData);
  }

  async updateBatch(id: number | string, batchData: any): Promise<any> {
    const existing = await this.batchRepository.getById(id);
    if (!existing) {
      throw new Error("Training batch not found");
    }
    
    return this.batchRepository.update(id, batchData);
  }

  async deleteBatch(id: number | string): Promise<boolean> {
    const existing = await this.batchRepository.getById(id);
    if (!existing) {
      throw new Error("Training batch not found");
    }
    return this.batchRepository.delete(id);
  }
}
