"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const ANIMATION_DURATION = 3000 // 3 seconds
const messages = ["Retrieving historical prices", "Crunching numbers", "Estimating future prices"] as const

export default function LoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [time, setTime] = useState(0)
  const pathRef = useRef<SVGPathElement>(null)
  const [dots, setDots] = useState<{ x: number; y: number }[]>([])
  const hasStartedFetch = useRef(false)

  // Add these new state variables
  const [flightData, setFlightData] = useState<any | null>(null)
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const [planeDone, setPlaneDone] = useState(false)

  // Extract city info from URL parameters
  const fromCity = (searchParams.get("from") || "Sydney").trim()
  const toFullString = (searchParams.get("to") || "").trim()
  const departureIata = searchParams.get("departureIata")

  const [currentMessage, setCurrentMessage] = useState(messages[0])

  useEffect(() => {
    // If we've already started the fetch, do nothing
    if (hasStartedFetch.current) return
    hasStartedFetch.current = true

    // Check if we have a forced redirect=results-1
    const redirect = searchParams.get("redirect")
    if (redirect === "results-1") {
      // This flow stays the same, do not change it
      const params = new URLSearchParams({
        departureDate: searchParams.get("departDate") || "",
        returnDate: searchParams.get("returnDate") || "",
        destinationIata: searchParams.get("toIata") || "",
        departureIata: departureIata || "",
      })
      router.replace(`/results-1?${params.toString()}`)
      return
    }

    // Otherwise, start fetching in parallel
    fetchFlightData(searchParams)
      .then((data) => {
        setFlightData(data)
      })
      .catch((error) => {
        console.error("Fetch error:", error)
        setFetchError(error)
      })
  }, [router, searchParams, departureIata])

  // Keep the animation effect separate
  useEffect(() => {
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed, ANIMATION_DURATION)
      setTime(progress)

      if (progress < ANIMATION_DURATION) {
        requestAnimationFrame(animate)
      } else {
        setPlaneDone(true)
      }
    }

    requestAnimationFrame(animate)
  }, [])

  // Cycle through status messages
  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentMessage(messages[1]), 1000)
    const timer2 = setTimeout(() => setCurrentMessage(messages[2]), 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  // Prepare the path and dots for the animated airplane
  useEffect(() => {
    if (pathRef.current) {
      const pathLength = pathRef.current.getTotalLength()
      const firstPoint = pathRef.current.getPointAtLength(0)
      const secondPoint = pathRef.current.getPointAtLength(pathLength / 3)
      const thirdPoint = pathRef.current.getPointAtLength((2 * pathLength) / 3)
      const lastPoint = pathRef.current.getPointAtLength(pathLength)
      setDots([firstPoint, secondPoint, thirdPoint, lastPoint])
    }
  }, [])

  // Add this new effect to handle navigation after animation
  useEffect(() => {
    // If plane is not done, do nothing
    if (!planeDone) return

    // Once the plane is done, check fetch results
    if (fetchError) {
      // If we got a fetch error, go to results-2
      router.replace(`/results-2?${searchParams.toString()}`)
      return
    }

    if (flightData) {
      // If fetch is done, see if data indicates noData or missing analysis
      if (flightData.noData || !flightData.analysis) {
        router.replace(`/results-2?${searchParams.toString()}`)
        return
      }

      // Check for null prices
      const hasNullPrices = flightData.analysis.some(
        (item: any) => item.adjusted_avg_price === null
      )
      if (hasNullPrices) {
        router.replace(`/results-2?${searchParams.toString()}`)
      } else {
        router.replace(`/graph?${searchParams.toString()}`)
      }
    } else {
      // If the plane is done but the fetch hasn't finished yet,
      // wait a short time then fallback to results-2
      setTimeout(() => {
        // If still no data after waiting, just fallback to results-2
        if (!flightData && !fetchError) {
          router.replace(`/results-2?${searchParams.toString()}`)
        }
      }, 2000)
    }
  }, [planeDone, fetchError, flightData, router, searchParams])

  return (
    <div className="min-h-screen bg-[#1c1f2e] text-white flex flex-col items-center justify-center">
      <div className="space-y-8 w-full max-w-4xl px-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{fromCity}</span>
          </div>

          <div className="relative flex-grow mx-4">
            <svg
              width="100%"
              viewBox="0 0 400 140"
              preserveAspectRatio="xMidYMid meet"
              className="max-w-[600px]"
            >
              <path
                ref={pathRef}
                d="M 20 70 Q 200 10 380 70"
                fill="none"
                stroke="rgba(96, 165, 250, 0.4)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {dots.map((dot, index) => (
                <circle key={index} cx={dot.x} cy={dot.y} r="4" fill="#fff" />
              ))}
              <g>
                <image
                  href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector-0ysLL3yAVAXUGIbkoz8LJbOxgE0S9B.svg"
                  width="40"
                  height="40"
                  x="-20"
                  y="-20"
                >
                  <animateMotion
                    dur="3s"
                    repeatCount="1"
                    fill="freeze"
                    rotate="auto"
                    path="M 20 70 Q 200 10 380 70"
                  ></animateMotion>
                </image>
              </g>
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{toFullString}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-[#282B3C] px-8 py-3 rounded-lg shadow-lg min-w-[300px] sm:min-w-[400px] flex justify-center">
            <h1 className="text-xl sm:text-2xl font-medium text-white/90">{currentMessage}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add this helper function
async function fetchFlightData(searchParams: URLSearchParams) {
  const rawDepartDate = searchParams.get("departDate") || ""
  const parsedDepartDate = new Date(rawDepartDate)
  const generatedUrl = `/api/flight-prices?${new URLSearchParams({
    destination_iata: searchParams.get("toIata") || "",
    departure_month: (parsedDepartDate.getMonth() + 1).toString(),
  }).toString()}`

  console.log("Generated API URL:", generatedUrl)

  const response = await fetch(generatedUrl)
  if (!response.ok) {
    throw new Error(`Non-OK response: ${response.status}`)
  }

  const data = await response.json()
  return data
}
