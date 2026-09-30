// CrewPulse Comprehensive Mock Data & State Definitions

export const INITIAL_EVENTS = [
  {
    id: "evt-101",
    name: "Bangalore Tech Summit 2026",
    category: "Tech Conference & Exhibition",
    venue: "BIEC Grand Convention Arena, Bengaluru",
    coordinates: { lat: 13.0617, lng: 77.4744 },
    date: "Today, Sep 29, 2026",
    status: "LIVE_ACTIVE",
    totalStaffNeeded: 36,
    staffHired: 34,
    staffOnSite: 29,
    escrowTotal: 184000,
    escrowReleased: 48000,
    reportingTime: "07:30 AM",
    shiftHours: "08:00 AM - 06:00 PM (10 hrs)",
    dressCode: "Smart Business Casual, Black Blazer with CrewPulse Badge",
    organizer: {
      name: "Nexus Event Tech Pvt Ltd",
      contactPerson: "Vikramaditya Roy",
      phone: "+91 98450 12345",
      verified: true
    }
  },
  {
    id: "evt-102",
    name: "Sunburn Arena EDM Music Festival",
    category: "Music & Entertainment Concert",
    venue: "E-City Open Grounds, Zone 4",
    coordinates: { lat: 12.8452, lng: 77.6602 },
    date: "Tomorrow, Sep 30, 2026",
    status: "UPCOMING_PREP",
    totalStaffNeeded: 75,
    staffHired: 70,
    staffOnSite: 0,
    escrowTotal: 425000,
    escrowReleased: 0,
    reportingTime: "01:00 PM",
    shiftHours: "02:00 PM - 01:00 AM (11 hrs)",
    dressCode: "All-Black Tactical, High-Visibility Armbands, Steel-Toe Boots",
    organizer: {
      name: "Percept Live Global",
      contactPerson: "Simran Kapoor",
      phone: "+91 98110 54321",
      verified: true
    }
  },
  {
    id: "evt-103",
    name: "Royal Udaipur Heritage Wedding",
    category: "Luxury Destination Wedding",
    venue: "The Jagmandir Palace, Udaipur",
    coordinates: { lat: 24.5714, lng: 73.6800 },
    date: "Oct 02 - 04, 2026",
    status: "SCHEDULED",
    totalStaffNeeded: 50,
    staffHired: 48,
    staffOnSite: 0,
    escrowTotal: 390000,
    escrowReleased: 0,
    reportingTime: "11:00 AM",
    shiftHours: "12:00 PM - 11:00 PM (11 hrs)",
    dressCode: "Traditional Royal Bandhgala / Saree (Supplied on-site)",
    organizer: {
      name: "Regal Knot Celebrations",
      contactPerson: "Arjun Singhania",
      phone: "+91 99201 88765",
      verified: true
    }
  }
];

export const INITIAL_STAFF = [
  {
    id: "stf-001",
    name: "Aarav Sharma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80",
    role: "Head of VIP Hospitality",
    category: "Hospitality & Ushering",
    rating: 4.96,
    reviewsCount: 48,
    reliabilityScore: 99.4, // Anti-ghosting rating %
    hourlyRate: 750, // in INR
    shiftsCompleted: 62,
    location: "Indiranagar, Bengaluru (3.2 km away)",
    distanceKm: 3.2,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["VIP Protocol", "Guest Relations", "Multi-lingual (EN, HI, KN)", "Conflict De-escalation"],
    certifications: [
      { name: "Certified Event Host Pro", issuer: "Federation of Event Hospitality", year: "2025" },
      { name: "Police Background Verification", id: "BLR-POL-98442", status: "VERIFIED" }
    ],
    currentStatus: "ON_SITE", // ON_SITE, EN_ROUTE, AVAILABLE, CLOCKED_OUT
    assignedEventId: "evt-101",
    zone: "VIP Lounge North",
    clockedInTime: "07:22 AM",
    geofenceVerified: true,
    hoursWorkedToday: 6.5,
    bio: "Ex-hotelier with 5 years luxury banquet hospitality experience. Known for exceptional crisis management and 100% punctuality record."
  },
  {
    id: "stf-002",
    name: "Rohan 'Ronnie' Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=260&q=80",
    role: "Chief Bouncer & Crowd Control Lead",
    category: "Security & Safety",
    rating: 4.98,
    reviewsCount: 82,
    reliabilityScore: 100.0,
    hourlyRate: 950,
    shiftsCompleted: 114,
    location: "Koramangala, Bengaluru (4.8 km away)",
    distanceKm: 4.8,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["Access Control", "Crowd Dynamics", "First Responder CPR", "Perimeter Defense"],
    certifications: [
      { name: "Certified Crowd Management L3", issuer: "National Safety Council", year: "2024" },
      { name: "Police Verification Clearance", id: "KA-POL-CLR-2026-09", status: "VERIFIED" },
      { name: "Red Cross First Aid & CPR", issuer: "Indian Red Cross", year: "2025" }
    ],
    currentStatus: "ON_SITE",
    assignedEventId: "evt-101",
    zone: "Gate 1 Turnstiles",
    clockedInTime: "07:14 AM",
    geofenceVerified: true,
    hoursWorkedToday: 6.75,
    bio: "Certified executive protection professional. Managed barricade & security protocols for high-profile concerts and international expos."
  },
  {
    id: "stf-003",
    name: "Pooja Hegde-Deshmukh",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=260&q=80",
    role: "Lead AV & Lighting Technician",
    category: "Audio/Visual & Stage Tech",
    rating: 4.92,
    reviewsCount: 39,
    reliabilityScore: 98.7,
    hourlyRate: 850,
    shiftsCompleted: 53,
    location: "Whitefield, Bengaluru (6.1 km away)",
    distanceKm: 6.1,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["DMX Lighting", "Digital Sound Consoles", "LED Wall Rigging", "Live Patching"],
    certifications: [
      { name: "Audio Engineering Diploma", issuer: "Sound Ideaz Academy", year: "2023" },
      { name: "Rigging Safety Standards OSHA", issuer: "Global Safety Board", year: "2025" }
    ],
    currentStatus: "ON_SITE",
    assignedEventId: "evt-101",
    zone: "Main Stage Audio Booth",
    clockedInTime: "07:28 AM",
    geofenceVerified: true,
    hoursWorkedToday: 6.5,
    bio: "Specialized in seamless live event AV switching, zero-feedback mic calibration, and high-intensity stage lighting synchronization."
  },
  {
    id: "stf-004",
    name: "Karan Johar-Mehta",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=260&q=80",
    role: "Senior Flair Bartender / Mixologist",
    category: "Bar & Catering",
    rating: 4.95,
    reviewsCount: 65,
    reliabilityScore: 99.1,
    hourlyRate: 900,
    shiftsCompleted: 78,
    location: "HSR Layout, Bengaluru (2.5 km away)",
    distanceKm: 2.5,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["Craft Cocktails", "Speed Service", "Inventory Tracking", "Bar Safety & Hygiene"],
    certifications: [
      { name: "WSET Spirits Level 2", issuer: "Wine & Spirits Education Trust", year: "2024" },
      { name: "Food Safety Standards Authority (FSSAI)", id: "FSSAI-2025-8819", status: "VERIFIED" }
    ],
    currentStatus: "EN_ROUTE",
    assignedEventId: "evt-101",
    zone: "Evening Cocktail Pavilion",
    clockedInTime: null,
    geofenceVerified: false,
    hoursWorkedToday: 0,
    bio: "High-volume cocktail craftsman with rapid-pour speed, flair artistry, and strict inventory compliance."
  },
  {
    id: "stf-005",
    name: "Ananya Swaminathan",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=260&q=80",
    role: "Lead Registration & Accreditation Desk",
    category: "Hospitality & Ushering",
    rating: 4.99,
    reviewsCount: 71,
    reliabilityScore: 100.0,
    hourlyRate: 600,
    shiftsCompleted: 88,
    location: "Malleshwaram, Bengaluru (1.9 km away)",
    distanceKm: 1.9,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["RFID Badge Printing", "Fast Check-in", "VIP Escort", "Fluent in 4 Languages"],
    certifications: [
      { name: "Digital Identity & Desk Operations", issuer: "Event Staff Guild", year: "2024" }
    ],
    currentStatus: "ON_SITE",
    assignedEventId: "evt-101",
    zone: "Registration Foyer",
    clockedInTime: "07:05 AM",
    geofenceVerified: true,
    hoursWorkedToday: 6.8,
    bio: "Pacesetter for large delegate check-ins (processed 1,200+ badges in 45 mins without queue congestion). Flawless record."
  },
  {
    id: "stf-006",
    name: "Devendra 'Dave' Patel",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=260&q=80",
    role: "Stage Floor Manager",
    category: "Stage & Production",
    rating: 4.88,
    reviewsCount: 34,
    reliabilityScore: 97.5,
    hourlyRate: 800,
    shiftsCompleted: 44,
    location: "Hebbal, Bengaluru (5.4 km away)",
    distanceKm: 5.4,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["Rundown Timing", "Speaker Mic Prep", "Backstage Queueing", "Emergency Pauses"],
    certifications: [
      { name: "Stage Management Professional", issuer: "Media & Entertainment Skill Council", year: "2024" }
    ],
    currentStatus: "AVAILABLE", // Standby candidate for Emergency replacement!
    assignedEventId: null,
    zone: null,
    clockedInTime: null,
    geofenceVerified: false,
    hoursWorkedToday: 0,
    bio: "Ready to deploy immediately. 7 years experience keeping live conference schedules to the exact second."
  },
  {
    id: "stf-007",
    name: "Sneha Nair",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=260&q=80",
    role: "Certified Emergency Paramedic / First Aider",
    category: "Security & Safety",
    rating: 5.0,
    reviewsCount: 29,
    reliabilityScore: 100.0,
    hourlyRate: 1100,
    shiftsCompleted: 38,
    location: "Jayanagar, Bengaluru (4.1 km away)",
    distanceKm: 4.1,
    verifiedGovtId: true,
    policeCleared: true,
    skills: ["Trauma Response", "AED & Triage", "Heat Exhaustion Care", "Ambulance Coordination"],
    certifications: [
      { name: "Emergency Medical Technician (EMT-B)", issuer: "Apollo Medskills", year: "2024" },
      { name: "BLS & ACLS Certified", issuer: "American Heart Association", year: "2025" }
    ],
    currentStatus: "ON_SITE",
    assignedEventId: "evt-101",
    zone: "Medical Bay Central",
    clockedInTime: "07:18 AM",
    geofenceVerified: true,
    hoursWorkedToday: 6.6,
    bio: "Licensed EMT with rapid medical response kit. Handled emergency medical triage at large scale marathons and stadiums."
  }
];

export const INITIAL_SHIFTS_FEED = [
  {
    id: "sft-201",
    title: "VIP Lounge Hospitality Executive",
    eventName: "Bangalore Tech Summit 2026",
    role: "VIP Hospitality",
    ratePerHour: 750,
    durationHours: 10,
    totalPay: 7500,
    date: "Today, Sep 29",
    timeWindow: "08:00 AM - 06:00 PM",
    venue: "BIEC Bengaluru, Hall 4",
    dressCode: "Black Blazer, Formal Trousers, Polished Shoes",
    spotsLeft: 2,
    escrowLocked: true,
    urgency: "HIGH",
    verifiedRequired: true
  },
  {
    id: "sft-202",
    title: "Concert Perimeter Bouncers & Security",
    eventName: "Sunburn Arena EDM Music Festival",
    role: "Crowd Security",
    ratePerHour: 950,
    durationHours: 11,
    totalPay: 10450,
    date: "Tomorrow, Sep 30",
    timeWindow: "02:00 PM - 01:00 AM",
    venue: "E-City Open Grounds",
    dressCode: "All Black Tactical Cargo, High-Vis Armband",
    spotsLeft: 5,
    escrowLocked: true,
    urgency: "MEDIUM",
    verifiedRequired: true
  },
  {
    id: "sft-203",
    title: "Mixologist & Craft Cocktail Specialist",
    eventName: "Royal Udaipur Heritage Wedding",
    role: "Mixology & Bar",
    ratePerHour: 900,
    durationHours: 11,
    totalPay: 9900,
    date: "Oct 02, 2026",
    timeWindow: "12:00 PM - 11:00 PM",
    venue: "Jagmandir Palace, Udaipur (Flights/Stay Covered)",
    dressCode: "Black Waistcoat & Bowtie",
    spotsLeft: 3,
    escrowLocked: true,
    urgency: "NORMAL",
    verifiedRequired: true
  },
  {
    id: "sft-204",
    title: "Stage Rigging & Sound Patch Technician",
    eventName: "Bangalore Tech Summit 2026",
    role: "AV Tech",
    ratePerHour: 850,
    durationHours: 8,
    totalPay: 6800,
    date: "Tomorrow, Sep 30",
    timeWindow: "07:00 AM - 03:00 PM",
    venue: "BIEC Main Auditorium",
    dressCode: "Crew Black T-shirt & Steel-toe Boots",
    spotsLeft: 1,
    escrowLocked: true,
    urgency: "HIGH",
    verifiedRequired: true
  }
];

export const INITIAL_ESCROW_TXNS = [
  {
    id: "tx-881",
    eventId: "evt-101",
    staffId: "stf-001",
    staffName: "Aarav Sharma",
    role: "Head of VIP Hospitality",
    hoursLogged: 6.5,
    hourlyRate: 750,
    grossAmount: 4875,
    platformFee: 243.75, // 5%
    netPayout: 4631.25,
    status: "ESCROW_LOCKED", // ESCROW_LOCKED, DISBURSED, DISPUTED
    timestamp: "2026-09-29 07:22 AM",
    escrowTxHash: "0x7F9a...3B19a4d8"
  },
  {
    id: "tx-882",
    eventId: "evt-101",
    staffId: "stf-002",
    staffName: "Rohan 'Ronnie' Verma",
    role: "Chief Bouncer & Crowd Control",
    hoursLogged: 6.75,
    hourlyRate: 950,
    grossAmount: 6412.5,
    platformFee: 320.62,
    netPayout: 6091.88,
    status: "ESCROW_LOCKED",
    timestamp: "2026-09-29 07:14 AM",
    escrowTxHash: "0x4C1e...9F71b28c"
  },
  {
    id: "tx-880",
    eventId: "evt-101",
    staffId: "stf-005",
    staffName: "Ananya Swaminathan",
    role: "Lead Registration Desk",
    hoursLogged: 8.0,
    hourlyRate: 600,
    grossAmount: 4800,
    platformFee: 240.0,
    netPayout: 4560.0,
    status: "DISBURSED", // Already signed off & paid!
    timestamp: "2026-09-29 07:05 AM",
    escrowTxHash: "0x9E2a...88cc2110"
  }
];

export const USER_STAFF_PROFILE = {
  id: "user-stf",
  name: "Arjun Devgan",
  title: "Professional Event Coordinator & Stage Manager",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=260&q=80",
  phone: "+91 98200 44556",
  email: "arjun.devgan@crew-pulse.io",
  rating: 4.97,
  reviewsCount: 54,
  reliabilityScore: 99.8,
  verifiedId: "AADHAAR-XX-7812",
  idVerifiedDate: "Aug 12, 2025",
  policeCertId: "KA-BLR-POL-2025-449",
  policeVerifiedDate: "Sep 01, 2025",
  hourlyRate: 750,
  shiftsCompleted: 49,
  lifetimeEarnings: 284500,
  walletBalance: 14250,
  pendingEscrow: 7500,
  skills: ["Stage Floor Operations", "VIP Escort Protocol", "Crowd Coordination", "Crisis Communication"],
  certifications: [
    { name: "Govt DigiLocker Identity Verification", status: "VERIFIED", badge: "ID_VERIFIED" },
    { name: "Police Crime Registry Clearance", status: "VERIFIED", badge: "POLICE_CLEAR" },
    { name: "Event Production & Crowd Safety L2", issuer: "MESC India", year: "2024" }
  ],
  activeShift: {
    shiftId: "sft-201",
    eventId: "evt-101",
    eventName: "Bangalore Tech Summit 2026",
    role: "VIP Hospitality & Protocol",
    venue: "BIEC Grand Convention Arena, Bengaluru",
    venueCoords: { lat: 13.0617, lng: 77.4744 },
    reportingTime: "07:30 AM",
    shiftWindow: "08:00 AM - 06:00 PM (10 hrs)",
    hourlyRate: 750,
    expectedPay: 7500,
    escrowLocked: true,
    dressCode: "Black Blazer, Formal Dark Trousers, Black Shoes",
    supervisor: "Vikramaditya Roy (+91 98450 12345)"
  }
};
