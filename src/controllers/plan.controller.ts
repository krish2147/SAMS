import { Request, Response, NextFunction } from "express";
import { PlanService } from "../services/plan.service";

export class PlanController {
  private planService = new PlanService();

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await this.planService.getAllPlans();
      res.json(plans);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.planService.getPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Membership plan not found" });
      }
      res.json(plan);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newPlan = await this.planService.createPlan(req.body);
      res.status(201).json({ success: true, plan: newPlan });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedPlan = await this.planService.updatePlan(req.params.id, req.body);
      res.json({ success: true, plan: updatedPlan });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.planService.deletePlan(req.params.id);
      res.json({ success: true, message: "Membership plan deleted successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
