import { Request, Response, NextFunction } from "express";
import { BatchService } from "../services/batch.service";
import { BatchOperationError } from "../utils/batch-operations";

/** The academy comes from the signed-in session, never from the request body. */
const academyOf = (req: Request) => String((req as any).user?.academyId || "swim");

function sendBatchError(res: Response, err: unknown) {
  if (err instanceof BatchOperationError) {
    return res.status(err.status).json({ success: false, code: err.code, error: err.message });
  }
  console.error("Batch operation failed:", err);
  return res.status(500).json({ success: false, error: "The batch could not be saved. Please try again." });
}

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

  getOperational = async (req: Request, res: Response) => {
    try {
      const batches = await this.batchService.getOperationalBatches(academyOf(req));
      res.json({ success: true, batches });
    } catch (err) {
      sendBatchError(res, err);
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const batch = await this.batchService.createBatch(academyOf(req), req.body);
      res.status(201).json({ success: true, batch });
    } catch (err) {
      sendBatchError(res, err);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const batch = await this.batchService.updateBatch(req.params.id, academyOf(req), req.body);
      res.json({ success: true, batch });
    } catch (err) {
      sendBatchError(res, err);
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.batchService.deleteBatch(req.params.id, academyOf(req));
      res.json({ success: true, message: "Batch deleted." });
    } catch (err) {
      sendBatchError(res, err);
    }
  };
}
