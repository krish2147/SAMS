import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getAnalytics(req: Request, res: Response) {
    try {
      const { filter, startDate, endDate } = req.query;

      const data = await analyticsService.getDashboardAnalytics({
        filter: filter as any,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        ...data
      });
    } catch (error: any) {
      console.error("Analytics Controller Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to calculate analytics metrics"
      });
    }
  }

  async globalSearch(req: Request, res: Response) {
    try {
      const q = String(req.query.q || "");
      const results = await analyticsService.globalSearch(q);
      res.json({
        success: true,
        query: q,
        results
      });
    } catch (error: any) {
      console.error("Global Search Controller Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Global search failed"
      });
    }
  }
}

