export function extractIataCode(input: string): string | null {
  const match = input.match(/$$([A-Z]{3})$$/)
  return match ? match[1] : null
}

