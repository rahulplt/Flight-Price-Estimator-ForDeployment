// Map of month abbreviations to numbers (1-12)
const monthMap: { [key: string]: number } = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
  // Add full month names for robustness
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
}

/**
 * Extracts the first month from a date range string and returns its corresponding number (1-12)
 * @param dateRangeStr - The date range string (e.g., "Feb 6, 2025 - Feb 20, 2025")
 * @returns number - The month number (1-12) or null if not found
 */
export function getFirstMonthNumber(dateRangeStr: string): number | null {
  try {
    // Handle empty or invalid input
    if (!dateRangeStr) return null

    // 1. Split at the hyphen to get the first date portion and trim whitespace
    const [startDate] = dateRangeStr.split("-").map((str) => str.trim())

    // 2. Split the first date by spaces
    const parts = startDate.split(" ")

    // 3. Get the month abbreviation (first part)
    const monthStr = parts[0]

    // 4. Return the corresponding month number or null if not found
    return monthMap[monthStr] || null
  } catch (error) {
    console.error("Error parsing date range:", error)
    return null
  }
}

/**
 * Test function to verify the month extraction works correctly
 */
export function testGetFirstMonthNumber(): void {
  const testCases = [
    "Feb 6, 2025 - Feb 20, 2025",
    "Feb 6 2025 - March 10 2025",
    "Nov 25 2025 - Dec 6 2025",
    "January 1, 2025 - December 31, 2025",
    "Mar 15 2025 - Apr 1 2025",
    "", // Empty string
    "Invalid date range", // Invalid input
  ]

  testCases.forEach((testCase) => {
    const result = getFirstMonthNumber(testCase)
    console.log(`Input: "${testCase}"\nOutput: ${result}\n`)
  })
}

