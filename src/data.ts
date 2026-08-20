import { AcademyTheme, Coach, Student, Booking, SupportQuery } from "./types";

export const academies: { [key: string]: AcademyTheme } = {
  swim: {
    id: "swim",
    name: "Baroda Swim Front",
    tagline: "The Zenith of Aquatic Performance",
    description: "An elite training center where refined technique meets hydro-dynamic efficiency. Designed for future Olympians and enthusiasts seeking absolute mastery of the water.",
    primaryColor: "sky",
    accentColor: "cyan",
    fontFamily: "font-sans",
    backgroundImage: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=1600&auto=format&fit=crop", // Luxury blue pool with glass accents
    logo: "🌊",
    welcomeMessage: "Welcome to the Liquid Sanctuary. Let's sculpt your perfect stroke.",
    features: [
      {
        title: "Olympic Standard Facilities",
        description: "Ten 50-meter, temperature-regulated, salt-purified lanes with underwater high-speed video capture analysis.",
        iconName: "Waves"
      },
      {
        title: "Hydro-Dynamic Analytics",
        description: "Advanced stroke profiling using wearable sensors to minimize drag and optimize metabolic conservation.",
        iconName: "Cpu"
      },
      {
        title: "Elite Coaching Staff",
        description: "Train directly under National coaches and former Olympic trialists utilizing curated training protocols.",
        iconName: "Award"
      }
    ]
  },
  cricket: {
    id: "cricket",
    name: "The Cricket Academy",
    tagline: "Preserving Legacy, Forging Champions",
    description: "A prestigious institution combining classical cricket values with high-precision kinetic training. The ultimate cradle for batting artistry and bowling fire.",
    primaryColor: "emerald",
    accentColor: "amber",
    fontFamily: "font-serif",
    backgroundImage: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1600&auto=format&fit=crop", // Lush green cricket field/stadium lights
    logo: "🏏",
    welcomeMessage: "Enter the Fields of Honor. Shape your legacy with every delivery.",
    features: [
      {
        title: "Precision Pitch Enclosures",
        description: "State-of-the-art indoor and outdoor turf pitches replicating international soil structures and bounce indexes.",
        iconName: "Grid"
      },
      {
        title: "Pro-Kinetic Bowling Labs",
        description: "Ultra-high frame rate camera setups tracking seam release angles, flight deviation, and bio-mechanical loads.",
        iconName: "Zap"
      },
      {
        title: "Tactical Masterclasses",
        description: "Intimate match-play simulations and strategic theory classrooms led by former Test Match captains.",
        iconName: "BookOpen"
      }
    ]
  }
};

export const swimCoaches: Coach[] = [
  {
    id: "swim_1",
    name: "Sanjay",
    specialty: "Aerobic Capacity & Freestyle Stroke",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    bio: "Elite SAMS coach. 15+ years coaching national-tier athletes with a focus on high-efficiency breathing kinetics."
  },
  {
    id: "swim_2",
    name: "Hetvi",
    specialty: "Hydro-Biomechanics & Butterfly Specialists",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop",
    bio: "Specializes in advanced telemetry and drag-reduction suit feedback to carve milliseconds off sprint finishes."
  }
];

export const cricketCoaches: Coach[] = [
  {
    id: "cricket_2",
    name: "Sanjay",
    specialty: "Elite Fast Bowling & Seam Dynamics",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop",
    bio: "Trained under global speed masters. Specializes in bowling action preservation, injury prevention, and out-swing craftsmanship."
  },
  {
    id: "cricket_3",
    name: "Hetvi",
    specialty: "Tactical Match-Play & Spin Artistry",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=300&auto=format&fit=crop",
    bio: "Legendary strategist. Leads advanced workshops on pitch evaluation, field settings, and match-deciding batting accelerations."
  }
];

export const initialStudents: Student[] = [];

export const initialBookings: Booking[] = [];

export const initialSupportQueries: SupportQuery[] = [];
