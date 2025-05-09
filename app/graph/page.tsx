"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, BellRing, Mail, Pencil, X } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import Image from "next/image"
import { Navbar } from "../components/Navbar"

interface PriceData {
  booking_month: string
  adjusted_avg_price: number
}

// Add type declaration at the top of the file
declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default function GraphPage() {
  const searchParams = useSearchParams()
  const initialRenderRef = useRef(true)

  // Get URL parameters once on initial render
  const fromParam = searchParams.get("from") || "Sydney"
  const toParam = searchParams.get("to") || "Tokyo"
  const departDateParam = searchParams.get("departDate") || ""
  const returnDateParam = searchParams.get("returnDate") || ""
  const generatedUrlParam = searchParams.get("generatedUrl")
  const departureIata = searchParams.get("departureIata") || ""
  const destinationIata = searchParams.get("toIata") || ""

  const [from, setFrom] = useState(fromParam)
  const [to, setTo] = useState(toParam)
  const [currentPrice, setCurrentPrice] = useState(750)
  const [dateRange, setDateRange] = useState({
    departDate: departDateParam,
    returnDate: returnDateParam,
  })
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState("")
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceStatus, setPriceStatus] = useState<"low" | "average" | "high">("average")
  const [departureDate, setDepartureDate] = useState<Date | null>(null)
  const [returnDate, setReturnDate] = useState<Date | null>(null)

  // Only track the submitted state for email
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Generate booking URL
  const generateBookingUrl = useCallback(() => {
    if (!departDateParam || !returnDateParam) return "#"

    const departureDate = format(new Date(departDateParam), "yyyy-MM-dd")
    const returnDate = format(new Date(returnDateParam), "yyyy-MM-dd")

    return `https://app.paylatertravel.com.au/flightssearch/s/${departureIata}/${destinationIata}/${departureDate}/${returnDate}?adults=1&children=0&infants=0&cabinClass=Y`
  }, [departDateParam, returnDateParam, departureIata, destinationIata])

  // Fetch data on initial render
  useEffect(() => {
    if (!initialRenderRef.current) return
    initialRenderRef.current = false

    const fetchData = async () => {
      if (!generatedUrlParam) {
        setError("No URL provided for data fetching")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(generatedUrlParam, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Expected JSON, got ${contentType}`)
        }

        const data = await response.json()
        if (data.analysis && Array.isArray(data.analysis)) {
          setPriceData(data.analysis)

          // Set initial current price
          const currentMonth = new Date().getMonth() + 1 // 1-12
          const currentMonthData = data.analysis.find(
            (item: PriceData) => Number(item.booking_month) === currentMonth
          )
          if (currentMonthData) {
            setCurrentPrice(currentMonthData.adjusted_avg_price)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [generatedUrlParam])

  // Calculate position percentage based on price
  const calculatePricePosition = useCallback(
    (price: number) => {
      if (priceData.length === 0) return 0
      const minPrice = Math.min(...priceData.map((d) => d.adjusted_avg_price))
      const maxPrice = Math.max(...priceData.map((d) => d.adjusted_avg_price))
      return ((price - minPrice) / (maxPrice - minPrice)) * 100
    },
    [priceData]
  )

  const indicatorPosition = calculatePricePosition(currentPrice)

  // Determine price status based on indicator position
  useEffect(() => {
    if (indicatorPosition <= 25) {
      setPriceStatus("low")
    } else if (indicatorPosition <= 70) {
      setPriceStatus("average")
    } else {
      setPriceStatus("high")
    }
  }, [indicatorPosition])

  // Format dates for display
  const formattedDates =
    dateRange.departDate && dateRange.returnDate
      ? `${format(new Date(dateRange.departDate), "do MMM")} - ${format(new Date(dateRange.returnDate), "do MMM")}`
      : "Select dates"

  // Simplified submission logic: on click, subscribe and immediately set submitted without closing the modal.
  const handleSubmit = async () => {
    if (!email) return

    try {
      // Push to dataLayer before making the API call
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "Email_submitted_pricealert",
        userEmail: email,
        fromCity: from,
        toCity: to,
        departureDate: dateRange.departDate,
        returnDate: dateRange.returnDate,
        currentPrice: currentPrice,
        priceStatus: priceStatus
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      setIsSubmitted(true)
    } catch (error) {
      console.error("Error submitting email:", error);
    }
  }

  const retryFetch = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }, [])

  const handleDateSelect = (date: Date) => {
    if (!departureDate) {
      setDepartureDate(date)
    } else if (!returnDate && date > departureDate) {
      setReturnDate(date)
    } else {
      // Reset or handle logic if both dates are selected
      setDepartureDate(date)
      setReturnDate(null)
    }
  }

  const getDatesInRange = (startDate: Date, endDate: Date) => {
    const dates = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return dates
  }

  const renderDate = (date: Date) => {
    const isDeparture = date.toDateString() === departureDate?.toDateString()
    const isReturn = date.toDateString() === returnDate?.toDateString()
    const inRange = departureDate && returnDate && date >= departureDate && date <= returnDate

    return (
      <div
        key={date.toDateString()}
        className={`date-cell ${isDeparture ? "font-bold" : ""} ${isReturn ? "font-bold" : ""} ${
          inRange ? "bg-lightgrey" : ""
        }`}
        onClick={() => handleDateSelect(date)}
      >
        {date.getDate()}
      </div>
    )
  }

  if (isLoading) {
    return <div className="min-h-screen bg-[#1c1f2e] pt-4 px-8 text-white">Loading...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1c1f2e] pt-4 px-8 text-white">
        <p className="text-red-500">{error}</p>
        <p className="text-white mt-2">URL attempted: {searchParams.get("generatedUrl")}</p>
        <Button onClick={retryFetch} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const bookingUrl = generateBookingUrl()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#1c1f2e] pt-4 px-2 sm:px-8 text-white">
        <div className="mx-auto w-full sm:max-w-6xl relative">
          {/* Header with Back button */}
          <div className="mb-4">
            <Link href="/">
              <Button variant="ghost" className="text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>

          {/* Main content container - make it flex column with proper spacing */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Flight route info - fluid scaling */}
            <div className="w-full max-w-[750px] mx-auto">
              <div className="flex flex-col items-center gap-3 sm:gap-6 mb-4 sm:mb-8">
                {/* Route section */}
                <div className="flex items-center justify-center w-full max-w-[1400px] px-4">
                  <div className="flex items-center justify-between w-full">
                    {/* Left city */}
                    <div className="z-10 flex items-center bg-[#1c1f2e]">
                      <span className="text-[16px] xs:text-xl sm:text-[26px] font-semibold text-white whitespace-nowrap">{from}</span>
                    </div>

                    {/* Center line and plane */}
                    <div className="relative flex-1 mx-2 sm:mx-6">
                      <div className="relative w-full h-[2px]">
                        {/* Dotted line with gap on both sides */}
                        <div className="absolute inset-y-0 left-[2px] right-[2px]">
                          <div className="w-full h-[2px] border-b-2 border-dotted border-blue-400/70"></div>
                        </div>
                        
                        {/* Plane */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 sm:-translate-x-[80%] -translate-y-1/2">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector-vh1Uae9QuVQDzNBwHJ2ymmHRbB8Jge.svg"
                            alt="Airplane"
                            width={55}
                            height={55}
                            className="w-[20px] h-[20px] xs:w-[25px] xs:h-[25px] sm:w-[55px] sm:h-[55px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right city */}
                    <div className="z-10 flex items-center bg-[#1c1f2e]">
                      <span className="text-[16px] xs:text-xl sm:text-[26px] font-semibold text-white whitespace-nowrap">{to}</span>
                    </div>
                  </div>
                </div>

                {/* Date display */}
                <div className="flex items-center gap-2 text-sm xs:text-base sm:text-[20px] font-medium text-white">
                  {formattedDates}
                </div>
              </div>
            </div>

            {/* Price Information Box - self contained */}
            <div className="w-full rounded-[32px] border border-blue-500/30 bg-[#282B3C] px-4 sm:px-20 py-6 sm:py-8">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-8">
                {/* Left side: Text content */}
                <div className="flex-1">
                  {priceStatus === "low" && (
                    <>
                      <h3 className="text-[32px] leading-tight font-semibold">
                        Price is currently <span className="text-[#4ADE80]">low</span>
                      </h3>
                      <p className="text-lg mt-2 text-gray-300">
                        Prices are typically low this time of the year. Book your flights now!
                      </p>
                      <div className="mt-4 inline-flex gap-2">
                        <Button 
                          onClick={() => {
                            window.dataLayer = window.dataLayer || [];
                            window.dataLayer.push({
                              event: "bookingSearchStarted",
                              source: "graph_low_price",
                            });
                          }}
                          asChild
                          className="bg-[#c1ff72] text-black hover:bg-[#a8e665] rounded-2xl px-4 h-12 text-base font-semibold"
                        >
                          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                            Book Now
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                  {priceStatus === "average" && (
                    <>
                      <h3 className="text-[32px] leading-tight font-semibold">
                        Prices are <span className="text-[#FCD34D]">average</span>
                      </h3>
                      <p className="text-lg mt-2 text-gray-300">
                        Prices may get cheaper. However, fares fluctuate all the time. Enter your email to access exclusive offers and updates.
                      </p>
                      <div className="mt-4 inline-flex gap-2">
                        <Button
                          className="bg-white text-black hover:bg-gray-100 rounded-2xl px-4 h-12 text-base font-semibold"
                          onClick={() => setShowModal(true)}
                        >
                          <Mail className="mr-2 h-5 w-5" />
                          Unlock Insider Info
                        </Button>
                        <Button 
                          onClick={() => {
                            window.dataLayer = window.dataLayer || [];
                            window.dataLayer.push({
                              event: "bookingSearchStarted",
                              source: "graph_average_price",
                            });
                          }}
                          asChild
                          className="bg-[#c1ff72] text-black hover:bg-[#a8e665] rounded-2xl px-4 h-12 text-base font-semibold"
                        >
                          <a href={bookingUrl} target="_blank" rel="noopener noreferrer"> 
                            Book Now
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                  {priceStatus === "high" && (
                    <>
                      <h3 className="text-[32px] leading-tight font-semibold">
                        Prices are <span className="text-[#F87171]">high</span>
                      </h3>
                      <p className="text-lg mt-2 text-gray-300">
                        Based on our data, prices are quite expensive. Enter your email to access exclusive offers and updates
                      </p>
                      <div className="mt-4 inline-flex gap-2">
                        <Button
                          className="bg-white text-black hover:bg-gray-100 rounded-2xl px-4 h-12 text-base font-semibold"
                          onClick={() => setShowModal(true)}
                        >
                          <Mail className="mr-2 h-5 w-5" />
                          Unlock Insider Info
                        </Button>
                        <Button 
                          onClick={() => {
                            window.dataLayer = window.dataLayer || [];
                            window.dataLayer.push({
                              event: "bookingSearchStarted",
                              source: "graph_high_price",
                            });
                          }}
                          asChild
                          className="bg-[#c1ff72] text-black hover:bg-[#a8e665] rounded-2xl px-4 h-12 text-base font-semibold"
                        >
                          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                            Book Now
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right side: Price indicator */}
                <div className="flex flex-col items-center sm:items-end gap-12 min-w-[400px] mt-4 sm:mt-0">
                  <div className="w-full relative mt-8">
                    {/* Container that holds all components as one group */}
                    <div className="relative right-[-2%] sm:right-0 w-[350px] sm:min-w-[400px] transform-gpu scale-[0.75] sm:scale-100 origin-center sm:origin-right">
                      {/* Gradient bar */}
                      <div className="h-3.5 sm:h-2 w-[98.5%] sm:w-full rounded-full bg-gray-700 overflow-hidden relative">
                        <div
                          className="absolute inset-y-0 left-0 w-[25%] bg-[#4ADE80] rounded-full"
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        ></div>
                        <div
                          className="absolute inset-y-0 left-[26%] w-[44%] bg-[#FCD34D] rounded-full"
                          style={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0
                          }}
                        ></div>
                        <div
                          className="absolute inset-y-0 left-[71%] right-0 bg-[#F87171] rounded-full"
                          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        ></div>
                      </div>

                      {/* Price bubble and icon container */}
                      <div
                        className="absolute z-20 bottom-0"
                        style={{
                          left: `${Math.min(Math.max(indicatorPosition, 0), 100)}%`,
                          transform: "translateX(-50%) translateY(-40%)"
                        }}
                      >
                        {/* Bubble and triangle container */}
                        <div className="relative translate-y-0 sm:-translate-y-1">
                          {/* Bubble */}
                          <div
                            className={`text-black px-5 sm:px-4 py-2.5 sm:py-1.5 rounded-[20px] text-base sm:text-sm font-medium whitespace-nowrap ${
                              indicatorPosition <= 25
                                ? "bg-[#4ADE80]"
                                : indicatorPosition <= 70
                                ? "bg-[#FCD34D]"
                                : "bg-[#F87171]"
                            }`}
                          >
                            {`A$${Math.round(currentPrice)} is ${priceStatus}`}
                          </div>
                          {/* Triangle pointer */}
                          <div
                            className="absolute left-1/2 bottom-[-8px] -translate-x-1/2 w-4 sm:w-3 h-4 sm:h-3"
                            style={{
                              clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                              backgroundColor:
                                indicatorPosition <= 25
                                  ? "#4ADE80"
                                  : indicatorPosition <= 70
                                  ? "#FCD34D"
                                  : "#F87171"
                            }}
                          ></div>
                        </div>

                        {/* Icon - position stays unchanged */}
                        <div className="flex justify-center mt-2 sm:mt-1">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%202085661501%202-9quPcXbyLpJjGizoJpSBNY64qULej8.svg"
                            alt="Price indicator"
                            width={32}
                            height={32}
                            className="w-10 h-10 sm:w-8 sm:h-8"
                          />
                        </div>
                      </div>

                      {/* Bigger price range text */}
                      <div className="mt-6 sm:mt-4 flex justify-between text-xl sm:text-base text-gray-300 font-medium w-[98.5%] sm:w-full">
                        <span>A${Math.round(Math.min(...priceData.map((d) => d.adjusted_avg_price)))}</span>
                        <span>A${Math.round(Math.max(...priceData.map((d) => d.adjusted_avg_price)))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Graph container - self contained */}
            <div className="w-full rounded-lg bg-[#1c1f2e] p-2 sm:p-6">
              <div className="relative transform -translate-x-8 sm:translate-x-0">
                <LineChart data={priceData} onPriceChange={setCurrentPrice} />
              </div>
            </div>

            {/* Powered by section */}
            <div className="w-full flex items-center justify-center -mt-0 pb-4 md:pb-0 -mb-7">
              <img
                src="/powered by.png"
                alt="Paylater"
                className="h-7"
              />
            </div>

            {/* Disclaimer - self contained */}
            <div className="w-full border-t border-white/20 pt-4 mt-4 sm:mt-6">
              <div className="w-full text-xs text-white px-4 sm:px-0 mb-4 sm:mb-6 text-left sm:text-center">
                *Please note: This tool provides flight price estimates based on our historical data and does not guarantee actual prices or flight availability. In some cases, the graph may show a dip in the final month, reflecting occasional last-minute deals that aren't always available. Search for a flight at{" "}
                <a
                  href="https://paylatertravel.com.au"
                  className="text-xs text-white underline hover:text-white/90"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  paylatertravel.com.au
                </a>{" "}
                to see actual prices.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal for setting price alert */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-[#282B3C] p-8 rounded-lg shadow-md w-[400px]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
            >
              <X size={24} />
            </button>
            {isSubmitted ? (
              // Submitted state: show confirmation and a button to close the modal.
              <div className="text-center">
                <h2 className="text-2xl mb-6 text-white flex items-center justify-center gap-2">
                  <Mail className="h-5 w-5 text-[#FFD700]" />
                  Submitted!
                </h2>
                <p className="mb-6 text-white">
                  Thank you! Your email has been captured.
                </p>
                <Button
                  onClick={() => setShowModal(false)}
                  className="bg-[#c1ff72] text-black hover:bg-[#a8e665] w-full h-12 text-lg font-medium rounded-md"
                >
                  Close
                </Button>
              </div>
            ) : (
              // Default state: email input and submit button.
              <>
                <h2 className="text-2xl mb-6 text-white flex items-center gap-2">
                  Unlock Insider Info <Mail className="h-5 w-5 text-[#FFD700]" />
                </h2>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-white/10 bg-[#1c1f2e] text-white p-3 w-full mb-6 rounded-md placeholder:text-white/40"
                />
                <Button
                  onClick={handleSubmit}
                  className="bg-[#c1ff72] text-black hover:bg-[#a8e665] w-full h-12 text-lg font-medium rounded-md"
                >
                  Submit
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
