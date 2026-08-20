import { Request, Response, NextFunction } from "express";
import { BookingService } from "../services/booking.service";

export class BookingController {
  private bookingService = new BookingService();

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const academyId = req.query.academyId as string;
      const bookings = await this.bookingService.getAllBookings(academyId);
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await this.bookingService.createBooking(req.body);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  };
}
