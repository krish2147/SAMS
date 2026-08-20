import { Request, Response, NextFunction } from "express";
import { BatchService } from "../services/batch.service";

export class BatchController {
  private batchService = new BatchService();

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batches = await this.batchService.getAllBatches();
      res.json(batches);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await this.batchService.getBatchById(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newBatch = await this.batchService.createBatch(req.body);
      res.status(201).json({ success: true, batch: newBatch });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedBatch = await this.batchService.updateBatch(req.params.id, req.body);
      res.json({ success: true, batch: updatedBatch });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.batchService.deleteBatch(req.params.id);
      res.json({ success: true, message: "Batch deleted successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
