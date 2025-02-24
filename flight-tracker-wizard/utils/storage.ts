export interface FlightSearchData {
  departureCity: string
  arrivalCity: string
  date: string | null
}

export const storageKey = "flightSearchData"

export const saveSearchData = (data: FlightSearchData) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(data))
  }
}

export const getSearchData = (): FlightSearchData | null => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(storageKey)
    return data ? JSON.parse(data) : null
  }
  return null
}

