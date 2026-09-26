// Production-safe reference data for the PAN-INDIA location taxonomy.
// Consumed by prisma/seed-locations.ts, which only ever INSERTS rows that are
// missing (matched by unique keys) — it never updates or deletes anything.
//
// Slugs are derived from names (see slugify in the seed script) and are
// globally unique for cities because they become top-level URLs (/mumbai).
// They must never collide with a static route — RESERVED_SLUGS is enforced.

export const COUNTRY = { name: "India", code: "IN" } as const;

export const RESERVED_SLUGS = [
  "buy", "rent", "search", "contact", "about", "admin", "api",
  "properties", "locations", "categories", "cities", "_next", "sitemap.xml", "robots.txt",
];

/** 28 states + 8 union territories. `code` is the ISO 3166-2:IN subdivision code. */
export const STATES: { name: string; code: string; type: "state" | "ut" }[] = [
  { name: "Andhra Pradesh", code: "IN-AP", type: "state" },
  { name: "Arunachal Pradesh", code: "IN-AR", type: "state" },
  { name: "Assam", code: "IN-AS", type: "state" },
  { name: "Bihar", code: "IN-BR", type: "state" },
  { name: "Chhattisgarh", code: "IN-CT", type: "state" },
  { name: "Goa", code: "IN-GA", type: "state" },
  { name: "Gujarat", code: "IN-GJ", type: "state" },
  { name: "Haryana", code: "IN-HR", type: "state" },
  { name: "Himachal Pradesh", code: "IN-HP", type: "state" },
  { name: "Jharkhand", code: "IN-JH", type: "state" },
  { name: "Karnataka", code: "IN-KA", type: "state" },
  { name: "Kerala", code: "IN-KL", type: "state" },
  { name: "Madhya Pradesh", code: "IN-MP", type: "state" },
  { name: "Maharashtra", code: "IN-MH", type: "state" },
  { name: "Manipur", code: "IN-MN", type: "state" },
  { name: "Meghalaya", code: "IN-ML", type: "state" },
  { name: "Mizoram", code: "IN-MZ", type: "state" },
  { name: "Nagaland", code: "IN-NL", type: "state" },
  { name: "Odisha", code: "IN-OR", type: "state" },
  { name: "Punjab", code: "IN-PB", type: "state" },
  { name: "Rajasthan", code: "IN-RJ", type: "state" },
  { name: "Sikkim", code: "IN-SK", type: "state" },
  { name: "Tamil Nadu", code: "IN-TN", type: "state" },
  { name: "Telangana", code: "IN-TG", type: "state" },
  { name: "Tripura", code: "IN-TR", type: "state" },
  { name: "Uttar Pradesh", code: "IN-UP", type: "state" },
  { name: "Uttarakhand", code: "IN-UT", type: "state" },
  { name: "West Bengal", code: "IN-WB", type: "state" },
  { name: "Andaman and Nicobar Islands", code: "IN-AN", type: "ut" },
  { name: "Chandigarh", code: "IN-CH", type: "ut" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "IN-DH", type: "ut" },
  { name: "Delhi", code: "IN-DL", type: "ut" },
  { name: "Jammu and Kashmir", code: "IN-JK", type: "ut" },
  { name: "Ladakh", code: "IN-LA", type: "ut" },
  { name: "Lakshadweep", code: "IN-LD", type: "ut" },
  { name: "Puducherry", code: "IN-PY", type: "ut" },
];

/** state name -> major cities / real-estate markets */
export const CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kakinada", "Rajahmundry", "Kurnool", "Amaravati"],
  "Arunachal Pradesh": ["Itanagar"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  Chhattisgarh: ["Raipur", "Bhilai", "Korba"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Rohtak", "Hisar", "Sonipat"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Ballari", "Davanagere", "Udupi", "Shivamogga"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Rewa", "Satna"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Navi Mumbai", "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur", "Amravati", "Nanded", "Pimpri-Chinchwad", "Kalyan-Dombivli", "Vasai-Virar", "Mira-Bhayandar"],
  Manipur: ["Imphal"],
  Meghalaya: ["Shillong"],
  Mizoram: ["Aizawl"],
  Nagaland: ["Kohima", "Dimapur"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar"],
  Sikkim: ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Hosur", "Thoothukudi"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  Tripura: ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Agra", "Noida", "Greater Noida", "Ghaziabad", "Meerut", "Gorakhpur", "Bareilly", "Aligarh", "Moradabad", "Mathura", "Jhansi", "Saharanpur", "Ayodhya"],
  Uttarakhand: ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Nainital", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa"],
  Delhi: ["Delhi", "New Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  Ladakh: ["Leh"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry"],
};

/** city name -> well-known localities (initial set for the biggest markets; admins add more). */
export const LOCALITIES: Record<string, string[]> = {
  Delhi: ["Dwarka", "Rohini", "Saket", "Vasant Kunj", "Janakpuri", "Pitampura", "Mayur Vihar", "Lajpat Nagar"],
  "New Delhi": ["Connaught Place", "Chanakyapuri", "Greater Kailash", "Defence Colony", "Hauz Khas", "Vasant Vihar"],
  Mumbai: ["Andheri", "Bandra", "Powai", "Juhu", "Worli", "Borivali", "Goregaon", "Malad", "Chembur", "Colaba"],
  Thane: ["Ghodbunder Road", "Majiwada", "Kolshet", "Naupada"],
  "Navi Mumbai": ["Vashi", "Nerul", "Kharghar", "Panvel", "Airoli"],
  Pune: ["Kothrud", "Baner", "Hinjewadi", "Wakad", "Viman Nagar", "Kharadi", "Hadapsar", "Aundh"],
  Bengaluru: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "Electronic City", "Hebbal", "Sarjapur Road", "Yelahanka", "JP Nagar"],
  Hyderabad: ["Gachibowli", "Madhapur", "Banjara Hills", "Jubilee Hills", "Kondapur", "Kukatpally", "Hitech City", "Miyapur"],
  Chennai: ["Adyar", "Anna Nagar", "T Nagar", "Velachery", "Old Mahabalipuram Road", "Porur", "Nungambakkam", "Mylapore"],
  Kolkata: ["Salt Lake", "New Town", "Ballygunge", "Alipore", "Park Street", "Behala", "Garia", "Jadavpur"],
  Ahmedabad: ["Satellite", "Bopal", "Prahlad Nagar", "Thaltej", "SG Highway", "Vastrapur", "Navrangpura", "Maninagar"],
  Gurugram: ["Golf Course Road", "Sohna Road", "Sector 56", "DLF Phase 5", "Cyber City", "MG Road", "New Gurugram", "Udyog Vihar"],
  Noida: ["Sector 62", "Sector 137", "Sector 150", "Sector 75", "Sector 18", "Sector 44"],
  "Greater Noida": ["Greater Noida West", "Alpha", "Beta", "Pari Chowk"],
  Jaipur: ["Vaishali Nagar", "Malviya Nagar", "C-Scheme", "Mansarovar", "Jagatpura"],
  Chandigarh: ["Sector 35", "Sector 22", "Sector 8", "Sector 44"],
  Lucknow: ["Gomti Nagar", "Hazratganj", "Indira Nagar", "Aliganj", "Jankipuram", "Alambagh", "Rajajipuram", "Chinhat", "Kalyanpur"],
};

/** Optional third level — only where an existing production row already relies on it. */
export const NEIGHBOURHOODS: Record<string, Record<string, string[]>> = {
  Lucknow: { "Gomti Nagar": ["Vibhuti Khand"] },
};
