"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrivalsSearch } from "@/components/ArrivalsSearch"
import { australianCities, cityToFlag } from "@/utils/city-flags"
import { saveSearchData, type FlightSearchData } from "@/utils/storage"
import { getFirstMonthNumber } from "@/utils/getFirstMonthNumber"
import type { DateRange } from "react-day-picker"
import "../styles/globals.css"


// Function to extract IATA code from city name
const extractIataCode = (city: string): string => {
  // Extract IATA code from strings like "Sydney (SYD)" or "Melbourne (MEL)"
  const match = city.match(/$$([A-Z]{3})$$/)
  if (match && match[1]) {
    return match[1]
  }

  // Fallback mapping if no parentheses found
  const cityToIata: { [key: string]: string } = {
    "Sydney (SYD)": "SYD",
    "Melbourne (MEL)": "MEL",
    "Brisbane (BNE)": "BNE",
    "Perth (PER)": "PER",
    "Adelaide (ADL)": "ADL",
    "Gold Coast (OOL)": "OOL",
  }

  return cityToIata[city] || "SYD"
}

export default function HomePage() {
  const router = useRouter()
  const [departureCity, setDepartureCity] = useState<string>(australianCities[0])
  const [arrivalCity, setArrivalCity] = useState("")
  const [arrivalIataCode, setArrivalIataCode] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [month, setMonth] = useState<Date>(new Date())

  const handleSubmit = useCallback(() => {
    if (!dateRange?.from) {
      toast({
        title: "Missing Date",
        description: "Please select a departure date.",
        variant: "destructive",
      })
      return
    }

    if (!arrivalIataCode) {
      toast({
        title: "Invalid Destination",
        description: "Please select a valid destination with an IATA code.",
        variant: "destructive",
      })
      return
    }

    const searchData: FlightSearchData = {
      departureCity,
      arrivalCity,
      date: JSON.stringify(dateRange),
    }
    saveSearchData(searchData)

    const dateRangeString = `${format(dateRange.from, "MMM d, yyyy")} - ${format(
      dateRange.to || dateRange.from,
      "MMM d, yyyy",
    )}`
    const monthNum = getFirstMonthNumber(dateRangeString)

    if (!monthNum) {
      toast({
        title: "Error",
        description: "Failed to extract month number. Please try again.",
        variant: "destructive",
      })
      return
    }

    // Get current month and year (1-based for month)
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Extract departure month and year
    const departureDate = new Date(dateRange.from)
    const departureMonth = departureDate.getMonth() + 1
    const departureYear = departureDate.getFullYear()

    // Extract departure IATA code
    const departureIataCode = extractIataCode(departureCity)

    // Check if departure is in the current month and year
    if (departureMonth === currentMonth && departureYear === currentYear) {
      const params = new URLSearchParams({
        from: departureCity,
        to: arrivalCity,
        toIata: arrivalIataCode,
        departDate: dateRange.from.toISOString(),
        returnDate: (dateRange.to || dateRange.from).toISOString(),
        redirect: "results-1",
        departureIata: departureIataCode,
      })
      router.push(`/loading?${params.toString()}`)
      return
    }

    // If it's a future month, continue with the original flow
    const baseUrl = "https://493a-34-125-94-151.ngrok-free.app/average_price/"
    const queryParams = new URLSearchParams({
      destination_iata: arrivalIataCode,
      departure_month: monthNum.toString(),
      num_travelers: "1",
    })
    const generatedUrl = `${baseUrl}?${queryParams.toString()}`

    console.log("Generated URL:", generatedUrl)

    const params = new URLSearchParams({
      from: departureCity,
      to: arrivalCity,
      toIata: arrivalIataCode,
      departDate: dateRange.from.toISOString(),
      returnDate: (dateRange.to || dateRange.from).toISOString(),
      generatedUrl: generatedUrl,
      departureIata: departureIataCode,
    })
    router.push(`/loading?${params.toString()}`)
  }, [departureCity, arrivalCity, arrivalIataCode, dateRange, router])

  const handleArrivalCityChange = (value: string, iataCode: string | null) => {
    setArrivalCity(value)
    setArrivalIataCode(iataCode)
  }

  return (
    <main className="min-h-screen bg-secondary p-8">
      <div className="mx-auto max-w-6xl rounded-lg bg-white p-8 shadow-lg">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-4xl font-bold">Travelling Soon?</h1>
              <h2 className="text-2xl font-semibold">Flight Price Predictor</h2>
            </div>


            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Departure city</label>
                <Select value={departureCity} onValueChange={setDepartureCity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {australianCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        <span className="flex items-center gap-2">
                          <span>{cityToFlag[city]}</span>
                          <span>{city}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Arrival city</label>
                <ArrivalsSearch value={arrivalCity} onChange={handleArrivalCityChange} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Select dates</label>
                  <div className="flex gap-2">
                    <button
                      className="p-1 text-gray-600 hover:text-gray-900"
                      onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    >
                      ←
                    </button>
                    <button
                      className="p-1 text-gray-600 hover:text-gray-900"
                      onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="relative rounded-md border calendar-wrapper max-w-[100%] overflow-hidden p-0 m-0">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    month={month}
                    onMonthChange={setMonth}
                    showOutsideDays={false}
                    className="w-full scale-90 origin-top p-0 m-0"
                  />
                </div>
                {dateRange?.from && (
                  <p className="mt-2 text-sm text-gray-600">
                    {dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      <>Select return date</>
                    )}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full bg-[#c1ff72] text-black hover:bg-[#a8e665] h-12 text-lg font-medium rounded-2xl"
                disabled={!dateRange?.from || !arrivalIataCode}
              >
                See if ticket $$ are going to get cheaper
              </Button>
            </div>
          </div>

          {/* Right Column */}
          <div className="rounded-lg bg-[#1c1f2e] p-8 text-white">
            <h2 className="mb-6 text-3xl font-bold text-center">How it works</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="text-xl font-bold">1.</span>
                <p className="text-lg">Select the destination you want to travel to ✈️</p>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-xl font-bold">2.</span>
                <p className="text-lg">See if flight ticket prices are going to get cheaper or not 🫣</p>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-xl font-bold">3.</span>
                <p className="text-lg">
                  Decide if you want to get flight price change alerts based on the price predictor graph 📊
                </p>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-xl font-bold">4.</span>
                <p className="text-lg">Put in your email to get notified 💌</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

