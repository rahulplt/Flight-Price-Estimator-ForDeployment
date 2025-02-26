import { iataData } from "./iataData"

// Create a mapping of IATA codes to country codes
export const iataToCountryCode: { [key: string]: string } = {
  // Australia & Pacific
  SYD: "AU",
  MEL: "AU",
  BNE: "AU",
  PER: "AU",
  ADL: "AU",
  OOL: "AU",
  AKL: "NZ", // Auckland, New Zealand
  NAN: "FJ", // Nadi, Fiji
  APW: "WS", // Apia, Samoa

  // Asia
  DPS: "ID", // Bali (Denpasar), Indonesia
  MNL: "PH", // Manila, Philippines
  BKK: "TH", // Bangkok, Thailand
  HKT: "TH", // Phuket, Thailand

  // United States
  MCO: "US", // Orlando
  LAS: "US", // Las Vegas
  LAX: "US", // Los Angeles
  MIA: "US", // Miami
  JFK: "US", // New York
  ATL: "US", // Atlanta
  IAH: "US", // Houston
  HNL: "US", // Honolulu

  // Caribbean & Mexico
  SJU: "PR", // San Juan, Puerto Rico
  MBJ: "JM", // Montego Bay, Jamaica
  CUN: "MX", // Cancun, Mexico
  PUJ: "DO", // Punta Cana, Dominican Republic

  // Europe
  LHR: "GB", // London, UK

  // India
  DEL: "IN",
  BOM: "IN",
  MAA: "IN",
  BLR: "IN",
  HYD: "IN",
  CCU: "IN",
}

// Create a mapping of country codes to flag emoji
export const countryCodeToFlag: { [key: string]: string } = {
  // Oceania
  AU: "🇦🇺", // Australia
  NZ: "🇳🇿", // New Zealand
  FJ: "🇫🇯", // Fiji
  WS: "🇼🇸", // Samoa

  // Asia
  ID: "🇮🇩", // Indonesia
  PH: "🇵🇭", // Philippines
  TH: "🇹🇭", // Thailand
  IN: "🇮🇳", // India

  // Americas
  US: "🇺🇸", // United States
  PR: "🇵🇷", // Puerto Rico
  JM: "🇯🇲", // Jamaica
  MX: "🇲🇽", // Mexico
  DO: "🇩🇴", // Dominican Republic

  // Europe
  GB: "🇬🇧", // United Kingdom

  UN: "🏳️", // Unknown
}

// Helper function to extract IATA code and city name from a string
export function extractIATAAndCity(input: string): { iataCode: string | null; cityName: string } {
  // First, try to match the format "City (IATA)" or just "IATA"
  const match = input.match(/^(.*?)\s*(?:$$([A-Z]{3})$$)?$/) || input.match(/^([A-Z]{3})$/)
  if (!match) return { iataCode: null, cityName: input }

  const [, cityName, iataCode] = match
  return {
    iataCode: iataCode || (input.length === 3 ? input : null),
    cityName: cityName ? cityName.trim() : input,
  }
}

// Function to get flag emoji from IATA code or city name
export function getFlagFromIATAOrCity(input: string): string {
  if (!input) return countryCodeToFlag["UN"]

  const { iataCode, cityName } = extractIATAAndCity(input)

  // If we have an IATA code, use it directly
  if (iataCode && iataToCountryCode[iataCode]) {
    return countryCodeToFlag[iataToCountryCode[iataCode]] || countryCodeToFlag["UN"]
  }

  // If the input itself is an IATA code
  if (input.length === 3 && input === input.toUpperCase() && iataToCountryCode[input]) {
    return countryCodeToFlag[iataToCountryCode[input]] || countryCodeToFlag["UN"]
  }

  // If no IATA code, try to find the city in our data
  const cityEntry = iataData.find((entry) => entry.name.toLowerCase() === cityName.toLowerCase())

  if (cityEntry && iataToCountryCode[cityEntry.code]) {
    return countryCodeToFlag[iataToCountryCode[cityEntry.code]] || countryCodeToFlag["UN"]
  }

  return countryCodeToFlag["UN"]
}

// For debugging purposes
export function debugIATACode(input: string): {
  input: string
  extracted: ReturnType<typeof extractIATAAndCity>
  flag: string
  countryCode?: string
} {
  const extracted = extractIATAAndCity(input)
  const iataCode = extracted.iataCode || input
  const countryCode = iataToCountryCode[iataCode]
  const flag = getFlagFromIATAOrCity(input)

  return {
    input,
    extracted,
    flag,
    countryCode,
  }
}

