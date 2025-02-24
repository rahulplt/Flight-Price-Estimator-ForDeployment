"use client"

import { useMemo } from "react"

interface PriceRangeIndicatorProps {
  minPrice: number
  maxPrice: number
  typicalPrice: number
}

export function PriceRangeIndicator({ minPrice, maxPrice, typicalPrice }: PriceRangeIndicatorProps) {
  // Calculate the position of the typical price as a percentage
  const typicalPricePosition = useMemo(() => {
    const range = maxPrice - minPrice
    return ((typicalPrice - minPrice) / range) * 100
  }, [minPrice, maxPrice, typicalPrice])

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl text-white font-semibold">
            We have not seen prices any lower than what it is now, best to book now
          </h2>
          <button className="bg-[#c1ff72] text-black px-4 py-2 rounded-lg font-medium">Book Now</button>
        </div>

        {/* Price indicator section */}
        <div className="relative">
          {/* Typical price bubble */}
          <div
            className="absolute -top-8 transform -translate-x-1/2 bg-[#c1ff72] text-black px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap"
            style={{ left: `${typicalPricePosition}%` }}
          >
            A${typicalPrice} is typical
          </div>

          {/* Bar and icon container */}
          <div className="relative h-4">
            {/* Gradient bar */}
            <div
              className="h-full rounded-full overflow-hidden"
              style={{
                background:
                  "linear-gradient(to right, #4ADE80 0%, #4ADE80 33%, #FCD34D 33%, #FCD34D 66%, #EF4444 66%, #EF4444 100%)",
              }}
            />

            {/* Pink profile icon - positioned at the same height as the bar */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${typicalPricePosition}%` }}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%202085661501%202-9quPcXbyLpJjGizoJpSBNY64qULej8.svg"
                alt="Current position"
                className="w-8 h-8"
              />
            </div>
          </div>

          {/* Price labels */}
          <div className="flex justify-between mt-2">
            <span className="text-white">A${minPrice}</span>
            <span className="text-white">A${maxPrice}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

