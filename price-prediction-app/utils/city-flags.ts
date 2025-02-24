export const australianCities = [
  "Sydney (SYD)",
  "Melbourne (MEL)",
  "Brisbane (BNE)",
  "Perth (PER)",
  "Adelaide (ADL)",
  "Gold Coast (OOL)",
] as const

// Create a mapping of IATA codes to their country flags
export const iataToFlag: { [key: string]: string } = {
  // Australia
  SYD: "🇦🇺",
  MEL: "🇦🇺",
  BNE: "🇦🇺",
  PER: "🇦🇺",
  ADL: "🇦🇺",
  OOL: "🇦🇺",

  // Pacific Islands
  DPS: "🇮🇩", // Bali, Indonesia
  APW: "🇼🇸", // Apia, Samoa
  NAN: "🇫🇯", // Nadi, Fiji
  PPT: "🇵🇫", // Tahiti, French Polynesia
  NOU: "🇳🇨", // New Caledonia
  IUE: "🇳🇺", // Niue
  TBU: "🇹🇴", // Tonga

  // Asia
  HND: "🇯🇵",
  NRT: "🇯🇵", // Tokyo, Japan
  ICN: "🇰🇷", // Seoul, South Korea
  PEK: "🇨🇳",
  PVG: "🇨🇳", // Beijing & Shanghai, China
  BKK: "🇹🇭", // Bangkok, Thailand
  SIN: "🇸🇬", // Singapore
  HKG: "🇭🇰", // Hong Kong
  MNL: "🇵🇭", // Manila, Philippines
  SGN: "🇻🇳", // Ho Chi Minh City, Vietnam
  KUL: "🇲🇾", // Kuala Lumpur, Malaysia
  CGK: "🇮🇩", // Jakarta, Indonesia

  // Americas
  LAX: "🇺🇸",
  SFO: "🇺🇸",
  JFK: "🇺🇸", // USA
  YVR: "🇨🇦",
  YYZ: "🇨🇦", // Canada
  MEX: "🇲🇽", // Mexico City
  GRU: "🇧🇷", // São Paulo, Brazil
  SCL: "🇨🇱", // Santiago, Chile
  BOG: "🇨🇴", // Bogota, Colombia
  LIM: "🇵🇪", // Lima, Peru
  EZE: "🇦🇷", // Buenos Aires, Argentina
  SJU: "🇵🇷", // San Juan, Puerto Rico

  // Europe
  LHR: "🇬🇧", // London, UK
  CDG: "🇫🇷", // Paris, France
  FCO: "🇮🇹", // Rome, Italy
  MAD: "🇪🇸", // Madrid, Spain
  AMS: "🇳🇱", // Amsterdam, Netherlands
  FRA: "🇩🇪", // Frankfurt, Germany
  IST: "🇹🇷", // Istanbul, Turkey
  DME: "🇷🇺", // Moscow, Russia
  ARN: "🇸🇪", // Stockholm, Sweden
  CPH: "🇩🇰", // Copenhagen, Denmark

  // Middle East
  DXB: "🇦🇪", // Dubai, UAE
  DOH: "🇶🇦", // Doha, Qatar
  AUH: "🇦🇪", // Abu Dhabi, UAE
  RUH: "🇸🇦", // Riyadh, Saudi Arabia

  // India & South Asia
  DEL: "🇮🇳",
  BOM: "🇮🇳", // Delhi & Mumbai, India
  CMB: "🇱🇰", // Colombo, Sri Lanka
  KTM: "🇳🇵", // Kathmandu, Nepal
  DAC: "🇧🇩", // Dhaka, Bangladesh

  // Africa
  JNB: "🇿🇦", // Johannesburg, South Africa
  CAI: "🇪🇬", // Cairo, Egypt
  NBO: "🇰🇪", // Nairobi, Kenya
  CPT: "🇿🇦", // Cape Town, South Africa

  // New Zealand
  AKL: "🇳🇿",
  WLG: "🇳🇿",
  CHC: "🇳🇿", // Auckland, Wellington, Christchurch
}

// Create a mapping of cities to their country flags
export const cityToFlag: { [key: string]: string } = {
  "Sydney (SYD)": "🇦🇺",
  "Melbourne (MEL)": "🇦🇺",
  "Brisbane (BNE)": "🇦🇺",
  "Perth (PER)": "🇦🇺",
  "Adelaide (ADL)": "🇦🇺",
  "Gold Coast (OOL)": "🇦🇺",
}

export const getFlag = (cityOrCode: string): string => {
  // If it's a direct city match
  if (cityToFlag[cityOrCode]) return cityToFlag[cityOrCode]

  // If it's an IATA code
  const upperCode = cityOrCode.toUpperCase()
  if (iataToFlag[upperCode]) return iataToFlag[upperCode]

  // If it contains an IATA code in parentheses
  const match = cityOrCode.match(/$$([A-Z]{3})$$/)
  if (match && iataToFlag[match[1]]) return iataToFlag[match[1]]

  // Default
  return "🏳️"
}

