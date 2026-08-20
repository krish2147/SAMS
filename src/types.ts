export type AcademyId = "swim" | "cricket";

export interface AcademyTheme {
  id: AcademyId;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string; // e.g., 'sky' or 'emerald'
  accentColor: string; // e.g., 'cyan' or 'amber'
  fontFamily: "font-sans" | "font-serif" | "font-mono" | "font-display";
  backgroundImage: string;
  logo: string;
  welcomeMessage: string;
  features: {
    title: string;
    description: string;
    iconName: string;
  }[];
}

export type UserRole = "parent" | "member" | "coach" | "receptionist" | "admin" | "super_admin" | "staff";

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  academyId: AcademyId;
  phoneNumber?: string;
  avatar: string;
  email?: string;
  token?: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  level: string; // e.g., 'Level 3 - Intermediate Stroke', 'Under-14 State Team'
  performanceHistory: {
    date: string;
    metric: string;
    value: number;
    unit: string;
    notes?: string;
  }[];
  attendance: { [date: string]: boolean };
}

export interface Booking {
  id: string;
  studentName: string;
  academyId: AcademyId;
  date: string;
  timeSlot: string;
  facility: string; // 'Lane 4', 'Net B Practice'
  status: "Confirmed" | "Pending" | "Cancelled";
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  image: string;
  bio: string;
}

export interface SupportQuery {
  id: string;
  sender: string;
  role: string;
  message: string;
  time: string;
  status: "unread" | "resolved";
}
