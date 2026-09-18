import { BookingRepository } from "../repositories/booking.repository";

export class BookingService {
  private bookingRepository = new BookingRepository();

  async getAllBookings(academyId?: string): Promise<any[]> {
    return this.bookingRepository.getAll(academyId);
  }

  async createBooking(booking: {
    studentName: string;
    academyId: string;
    date: string;
    timeSlot: string;
    facility: string;
    status?: string;
  }): Promise<any> {
    const id = `b_${Math.random().toString(36).substring(2, 7)}`;
    return this.bookingRepository.create({
      id,
      ...booking
    });
  }
}
