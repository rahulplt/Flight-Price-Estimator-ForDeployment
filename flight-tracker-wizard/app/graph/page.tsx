"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, BellRing, Pencil, X } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import Image from "next/image"

interface PriceData {
  booking_month: string
  adjusted_avg_price: number
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

  // Generate booking URL
  const generateBookingUrl = useCallback(() => {
    if (!departDateParam || !returnDateParam) return "#"

    const departureDate = format(new Date(departDateParam), "yyyy-MM-dd")
    const returnDate = format(new Date(returnDateParam), "yyyy-MM-dd")

    return `https://www.paylatertravel.com.au/flightssearch/s/${departureIata}/${destinationIata}/${departureDate}/${returnDate}?adults=1&children=0&infants=0&cabinClass=Y`
  }, [departDateParam, returnDateParam, departureIata, destinationIata])

  // Single effect for data fetching on initial render
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
          const currentMonthData = data.analysis.find((item: PriceData) => Number(item.booking_month) === currentMonth)
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
    [priceData],
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

  const handleSubmit = () => {
    console.log("Email submitted:", email)
    setShowModal(false)
    setEmail("")
  }

  const retryFetch = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }, [])

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
    <main className="min-h-screen bg-[#1c1f2e] pt-4 px-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-8 mb-8">
            <div className="relative flex w-full max-w-3xl items-center justify-between px-4">
              <div className="z-10 flex items-center gap-2 bg-[#1c1f2e] pr-4">
                <span className="text-3xl font-semibold text-white">{from}</span>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 transform">
                <div className="relative">
                  <div className="absolute left-1/2 top-1/2 h-[2px] w-[500px] -translate-x-1/2 -translate-y-1/2 transform">
                    <div className="h-full w-full border-b-2 border-dotted border-blue-400/70"></div>
                  </div>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector-vh1Uae9QuVQDzNBwHJ2ymmHRbB8Jge.svg"
                    alt="Airplane"
                    width={55}
                    height={55}
                    className="relative transform -translate-x-1/2 rotate-[0deg]"
                  />
                </div>
              </div>
              <div className="z-10 flex items-center gap-2 bg-[#1c1f2e] pl-4">
                <span className="text-3xl font-semibold text-white">{to}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xl font-medium text-white">
              {formattedDates}
              <Pencil className="h-4 w-4" />
            </div>
          </div>

          {/* Price Information Box */}
          <div className="rounded-[32px] border border-blue-500/30 bg-[#282B3C] px-20 py-8">
            <div className="flex justify-between items-start gap-8">
              {/* Left side: Text content */}
              <div className="flex-1">
                {priceStatus === "low" && (
                  <>
                    <h3 className="text-[32px] leading-tight font-semibold">
                      Price is currently <span className="text-[#4ADE80]">low</span>
                    </h3>
                    <p className="text-lg mt-2 text-gray-300">
                      Prices are typically low this time of the year, Book your flights now!
                    </p>
                  </>
                )}
                {priceStatus === "average" && (
                  <>
                    <h3 className="text-[32px] leading-tight font-semibold">
                      Prices are <span className="text-[#FCD34D]">average</span>
                    </h3>
                    <p className="text-lg mt-2 text-gray-300">
                      Prices may get cheaper. However, fares fluctuate all the time. Set a price alert to be notified if
                      prices get cheaper
                    </p>
                  </>
                )}
                {priceStatus === "high" && (
                  <>
                    <h3 className="text-[32px] leading-tight font-semibold">
                      Prices are <span className="text-[#F87171]">high</span>
                    </h3>
                    <p className="text-lg mt-2 text-gray-300">
                      Based on our data, prices are quite expensive. Set a price alert to be notified when fares get
                      cheaper
                    </p>
                  </>
                )}
              </div>

              {/* Right side: Button and price indicator */}
              <div className="flex flex-col items-end gap-12 min-w-[400px]">
                {/* Button container */}
                <div>
                  {priceStatus === "low" ? (
                    <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-[#c1ff72] text-black hover:bg-[#a8e665] rounded-2xl px-6 h-12 text-lg font-semibold">
                        Book Now
                      </Button>
                    </a>
                  ) : (
                    <Button
                      className="bg-white text-black hover:bg-gray-100 rounded-2xl px-6 h-12 text-lg font-semibold"
                      onClick={() => setShowModal(true)}
                    >
                      <Bell className="mr-3 h-5 w-5" />
                      Set Price Alert
                    </Button>
                  )}
                </div>

                {/* Price indicator container */}
                <div className="w-full relative mt-8">
                  {/* Gradient bar */}
                  <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden relative">
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
                        borderBottomRightRadius: 0,
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
                      transform: "translateX(-50%) translateY(-40%)",
                    }}
                  >
                    {/* Price bubble */}
                    <div className="relative mb-1">
                      <div
                        className={`text-black px-4 py-1.5 rounded-[20px] text-sm font-medium whitespace-nowrap ${
                          indicatorPosition <= 25
                            ? "bg-[#4ADE80]" // Green for low prices
                            : indicatorPosition <= 70
                              ? "bg-[#FCD34D]" // Yellow for average prices
                              : "bg-[#F87171]" // Red for high prices
                        }`}
                      >
                        {`A$${Math.round(currentPrice)} is ${priceStatus}`}
                      </div>
                      <div
                        className="absolute left-1/2 bottom-[-6px] -translate-x-1/2 w-3 h-3"
                        style={{
                          clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                          backgroundColor:
                            indicatorPosition <= 25
                              ? "#4ADE80" // Green for low prices
                              : indicatorPosition <= 70
                                ? "#FCD34D" // Yellow for average prices
                                : "#F87171", // Red for high prices
                        }}
                      ></div>
                    </div>

                    {/* Pink circle indicator - adjusted positioning */}
                    <div className="flex justify-center mt-1">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%202085661501%202-9quPcXbyLpJjGizoJpSBNY64qULej8.svg"
                        alt="Price indicator"
                        width={32}
                        height={32}
                        className="w-8 h-8"
                      />
                    </div>
                  </div>

                  {/* Price range labels */}
                  <div className="mt-4 flex justify-between text-base text-gray-300 font-medium">
                    <span>A${Math.round(Math.min(...priceData.map((d) => d.adjusted_avg_price)))}</span>
                    <span>A${Math.round(Math.max(...priceData.map((d) => d.adjusted_avg_price)))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="rounded-lg bg-[#1c1f2e] p-6">
            <div className="relative">
              <LineChart data={priceData} onPriceChange={setCurrentPrice} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-[#282B3C] p-8 rounded-lg shadow-md w-[400px]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl mb-6 text-white flex items-center gap-2">
              Set Price Alert <BellRing className="h-5 w-5 fill-[#FFD700] text-[#FFD700]" />
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
          </div>
        </div>
      )}
    </main>
  )
}

