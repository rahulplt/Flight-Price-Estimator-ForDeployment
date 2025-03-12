/**
 * Extracts the IATA code from a string containing a city name and IATA code in parentheses.
 * @param value - The input string (e.g., "Bali (DPS)" or "Delhi (DEL)")
 * @returns The extracted IATA code or null if not found
 */
export function extractIataCode(value: string): string | null {
  const match = value.match(/\(([A-Z]{3})\)/)
  return match ? match[1] : null
}

