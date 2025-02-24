"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"

export default function Results1Page() {
  const searchParams = useSearchParams()

  // Get URL parameters
  const departureDateParam = searchParams.get("departureDate")
  const returnDateParam = searchParams.get("returnDate")
  const destinationIata = searchParams.get("destinationIata")
  const departureIata = searchParams.get("departureIata")

  // Format dates for display
  const formattedDepartureDate = departureDateParam
    ? format(new Date(departureDateParam), "MMM d, yyyy")
    : "Not specified"
  const formattedReturnDate = returnDateParam ? format(new Date(returnDateParam), "MMM d, yyyy") : "Not specified"

  // Generate booking URL
  const generateBookingUrl = () => {
    if (!departureDateParam || !returnDateParam || !departureIata || !destinationIata) {
      return "#" // Return a placeholder if any required parameter is missing
    }

    const departureDate = format(new Date(departureDateParam), "yyyy-MM-dd")
    const returnDate = format(new Date(returnDateParam), "yyyy-MM-dd")

    return `https://www.paylatertravel.com.au/flightssearch/s/${departureIata}/${destinationIata}/${departureDate}/${returnDate}?adults=1&children=0&infants=0&cabinClass=Y`
  }

  const bookingUrl = generateBookingUrl()

  return (
    <main className="min-h-screen bg-[#1c1f2e] pt-4 px-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-8">
          {/* Main Message */}
          <div className="rounded-[32px] border border-blue-500/30 bg-[#282B3C] p-8">
            <h1 className="text-3xl font-bold text-[#4ADE80] mb-6">
              You're so close to the trip! Flight prices are only going to increase
            </h1>

            {/* Travel Details */}
            <div className="space-y-4 text-lg">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Departure:</span>
                <span className="font-medium">{formattedDepartureDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Return:</span>
                <span className="font-medium">{formattedReturnDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">From:</span>
                <span className="font-medium">{departureIata}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">To:</span>
                <span className="font-medium">{destinationIata}</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex justify-center">
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#c1ff72] text-black hover:bg-[#a8e665] h-12 px-8 text-lg font-medium rounded-2xl">
                Book Now
              </Button>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

