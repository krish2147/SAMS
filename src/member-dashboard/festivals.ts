// Festivals and public holidays shown on the member calendar (Gujarat / India).
// Dates from timeanddate.com (India 2026, 2027), cross-checked with BankBazaar's Gujarat 2026 list.
// Islamic festivals follow the moon, so their dates are tentative and can move by a day.
// These are festival dates only. They do not mean the pool is closed; closures come from the
// academy's own holidays (Admin > Calendar), which the calendar shows separately.
// Add the next year's dates here each December.

export interface Festival {
  name: string;
  date: string;        // YYYY-MM-DD
  endDate?: string;    // for festivals that run over several days
  tentative?: boolean; // moon-sighted dates
}

export const FESTIVALS: Festival[] = [
  // 2026
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Navratri", date: "2026-10-11", endDate: "2026-10-19" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Sardar Patel Jayanti", date: "2026-10-31" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Gujarati New Year", date: "2026-11-09" },
  { name: "Bhai Bij", date: "2026-11-11" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24" },
  { name: "Christmas", date: "2026-12-25" },
  // 2027
  { name: "Uttarayan", date: "2027-01-14" },
  { name: "Vasi Uttarayan", date: "2027-01-15" },
  { name: "Republic Day", date: "2027-01-26" },
  { name: "Maha Shivratri", date: "2027-03-06" },
  { name: "Eid al-Fitr", date: "2027-03-10", tentative: true },
  { name: "Holika Dahan", date: "2027-03-21" },
  { name: "Dhuleti (Holi)", date: "2027-03-22" },
  { name: "Good Friday", date: "2027-03-26" },
  { name: "Ambedkar Jayanti", date: "2027-04-14" },
  { name: "Ram Navami", date: "2027-04-15" },
  { name: "Mahavir Jayanti", date: "2027-04-19" },
  { name: "Gujarat Day", date: "2027-05-01" },
  { name: "Eid al-Adha (Bakri Eid)", date: "2027-05-17", tentative: true },
  { name: "Muharram", date: "2027-06-16", tentative: true },
  { name: "Independence Day", date: "2027-08-15" },
  { name: "Raksha Bandhan", date: "2027-08-17" },
  { name: "Janmashtami", date: "2027-08-25" },
  { name: "Ganesh Chaturthi", date: "2027-09-04" },
  { name: "Navratri", date: "2027-09-30", endDate: "2027-10-08" },
  { name: "Gandhi Jayanti", date: "2027-10-02" },
  { name: "Dussehra", date: "2027-10-09" },
  { name: "Diwali", date: "2027-10-29" },
  { name: "Gujarati New Year", date: "2027-10-30" },
  { name: "Bhai Bij", date: "2027-10-31" },
  { name: "Sardar Patel Jayanti", date: "2027-10-31" },
  { name: "Guru Nanak Jayanti", date: "2027-11-14" },
  { name: "Christmas", date: "2027-12-25" },
];
