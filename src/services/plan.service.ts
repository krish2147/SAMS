import { PlanRepository } from "../repositories/plan.repository";

export class PlanService {
  private planRepository = new PlanRepository();

  async getAllPlans(): Promise<any[]> {
    return this.planRepository.getAll();
  }

  async getPlanById(id: number | string): Promise<any | null> {
    return this.planRepository.getById(id);
  }

  async createPlan(planData: any): Promise<any> {
    if (!planData.name || !planData.name.trim()) {
      throw new Error("Plan name is required");
    }
    if (!planData.duration_months || isNaN(Number(planData.duration_months))) {
      throw new Error("Plan duration in months must be a valid number");
    }
    return this.planRepository.create(planData);
  }

  async updatePlan(id: number | string, planData: any): Promise<any> {
    const existing = await this.planRepository.getById(id);
    if (!existing) {
      throw new Error("Membership plan not found");
    }
    return this.planRepository.update(id, planData);
  }

  async deletePlan(id: number | string): Promise<boolean> {
    const existing = await this.planRepository.getById(id);
    if (!existing) {
      throw new Error("Membership plan not found");
    }
    return this.planRepository.delete(id);
  }
}
