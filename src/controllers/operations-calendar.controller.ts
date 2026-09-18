import { NextFunction, Request, Response } from "express";
import { OperationsCalendarService } from "../services/operations-calendar.service";
import { ActivityService } from "../services/activity.service";

export class OperationsCalendarController {
  private service = new OperationsCalendarService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await this.service.listAdmin(Number(req.query.limit))); } catch (error) { next(error); }
  };

  createEvent = async (req: any, res: Response, next: NextFunction) => {
    try {
      const actor = req.user?.name || req.user?.email || "Admin";
      const event = await this.service.createEvent(req.body, actor);
      await ActivityService.logActivity(event.title, "Event Created", event.status, actor);
      res.status(201).json({ success: true, event });
    } catch (error) { next(error); }
  };

  updateEvent = async (req: any, res: Response, next: NextFunction) => {
    try {
      const actor = req.user?.name || req.user?.email || "Admin";
      const event = await this.service.updateEvent(Number(req.params.id), req.body);
      await ActivityService.logActivity(event.title, "Event Updated", event.status, actor);
      res.json({ success: true, event });
    } catch (error) { next(error); }
  };

  createHoliday = async (req: any, res: Response, next: NextFunction) => {
    try {
      const actor = req.user?.name || req.user?.email || "Admin";
      const holiday = await this.service.createHoliday(req.body, actor);
      await ActivityService.logActivity(holiday.name, "Holiday Created", holiday.status, actor);
      res.status(201).json({ success: true, holiday });
    } catch (error) { next(error); }
  };

  updateHoliday = async (req: any, res: Response, next: NextFunction) => {
    try {
      const actor = req.user?.name || req.user?.email || "Admin";
      const holiday = await this.service.updateHoliday(Number(req.params.id), req.body);
      await ActivityService.logActivity(holiday.name, "Holiday Updated", holiday.status, actor);
      res.json({ success: true, holiday });
    } catch (error) { next(error); }
  };

  deleteEvent = async (req: any, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteItem("events", Number(req.params.id));
      await ActivityService.logActivity(`Event #${req.params.id}`, "Event Permanently Deleted", "Deleted", req.user?.name || "Admin");
      res.json({ success: true });
    } catch (error) { next(error); }
  };

  deleteHoliday = async (req: any, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteItem("holidays", Number(req.params.id));
      await ActivityService.logActivity(`Holiday #${req.params.id}`, "Holiday Permanently Deleted", "Deleted", req.user?.name || "Admin");
      res.json({ success: true });
    } catch (error) { next(error); }
  };
}
