"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { getFlag } from "@/utils/city-flags"

const loadingMessages = ["retrieving historical prices", "crunching numbers", "estimating future prices"] as const

const positions = [0, 33, 66, 100]

export default function LoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Get the from and to cities from URL parameters and ensure they're properly formatted
  const fromCity = (searchParams.get("from") || "Sydney").trim()
  const toCity = (searchParams.get("to") || "Tokyo").trim()

  // Handle message transitions and plane movement
  useEffect(() => {
    // First message and position (0%)
    setMessageIndex(0)
    setProgress(positions[0])

    // Second message and position (33%) after 0.5s
    const timer1 = setTimeout(() => {
      setMessageIndex(1)
      setProgress(positions[1])
    }, 500)

    // Third message and position (66%) after 1s
    const timer2 = setTimeout(() => {
      setMessageIndex(2)
      setProgress(positions[2])
    }, 1000)

    // Final position (100%) after 1.5s
    const timer3 = setTimeout(() => {
      setProgress(positions[3])
    }, 1500)

    // Navigate after 2s total
    const navigationTimer = setTimeout(() => {
      router.push(`/graph?${searchParams.toString()}`)
    }, 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(navigationTimer)
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#1c1f2e] text-white flex flex-col items-center justify-center -mt-16">
      <div className="space-y-16">
        {/* Top row for departure and arrival */}
        <div className="flex items-center justify-center w-full max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFlag(fromCity)}</span>
            <span className="text-2xl font-semibold">{fromCity}</span>
          </div>

          {/* Middle: dotted line + plane icon */}
          <div className="relative mx-8">
            <div className="w-[300px] border-b-2 border-dotted border-blue-400/40"></div>
            <div
              className="absolute top-1/2 transition-all duration-300 ease-in-out"
              style={{
                left: `${progress}%`,
                transform: `translateX(-50%) translateY(-50%)`,
              }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector-0ysLL3yAVAXUGIbkoz8LJbOxgE0S9B.svg"
                alt="Plane"
                width={40}
                height={40}
                className="rotate-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{toCity}</span>
            <span className="text-2xl">{getFlag(toCity)}</span>
          </div>
        </div>

        {/* Sequential loading messages */}
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white/90">{loadingMessages[messageIndex]}</h1>
        </div>
      </div>
    </div>
  )
}

