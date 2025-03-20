"use client"

import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import Image from "next/image"
import { useEffect, useRef } from "react"

interface PriceData {
  booking_month: string
  adjusted_avg_price: number
}

interface LineChartProps {
  data: PriceData[]
  onPriceChange: (price: number) => void
}

const monthNumberToName: { [key: number]: string } = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
}

export function LineChart({ data, onPriceChange }: LineChartProps) {
  const initialPriceSet = useRef(false)
  const currentMonth = new Date().getMonth() + 1 // Get current month (1-12)

  useEffect(() => {
    if (!initialPriceSet.current && data.length > 0) {
      const currentMonthData = data.find((item) => Number(item.booking_month) === currentMonth)
      if (currentMonthData) {
        onPriceChange(currentMonthData.adjusted_avg_price)
      } else {
        onPriceChange(data[0].adjusted_avg_price)
      }
      initialPriceSet.current = true
    }
  }, [data, onPriceChange, currentMonth])

  const monthNumbers = data.map((item) => Number(item.booking_month))
  const minMonth = Math.min(...monthNumbers)
  const maxMonth = Math.max(...monthNumbers)

  return (
    <div className="space-y-6 relative">
      {/* Header with title and legend */}
      <div className="flex items-center justify-between translate-x-8 sm:translate-x-0 mb-6 sm:pl-[40px] sm:pr-5">
        <h2 className="text-lg sm:text-2xl font-semibold text-white">Estimated Price</h2>
        <div className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%202085661501%202-9quPcXbyLpJjGizoJpSBNY64qULej8.svg"
            alt="Current position"
            width={32}
            height={32}
            className="w-6 h-6 sm:w-8 sm:h-8"
          />
          <span className="text-white text-base sm:text-lg font-semibold">You are here</span>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="booking_month"
              stroke="#888888"
              fontSize={14}
              tickLine={{ stroke: "#ffffff" }}
              tickSize={8}
              axisLine={{ stroke: "#ffffff" }}
              style={{ fill: "rgba(255,255,255,0.6)" }}
              domain={[minMonth, maxMonth]}
              type="number"
              allowDataOverflow
              ticks={monthNumbers}
              tickFormatter={(value) => monthNumberToName[value] || value}
              padding={{ left: 20, right: 20 }} // Add padding to prevent cutoff
            />
            <YAxis
              stroke="#888888"
              fontSize={14}
              tickLine={{ stroke: "#ffffff" }}
              tickSize={8}
              axisLine={{ stroke: "#ffffff" }}
              tickFormatter={(value) => `A$${value}`}
              domain={["auto", "auto"]}
              style={{ fill: "rgba(255,255,255,0.6)" }}
              padding={{ top: 20, bottom: 20 }} // Add padding to prevent cutoff
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#282B3C", border: "none" }}
              labelStyle={{ color: "#ffffff" }}
              formatter={(value: number) => [`A$${value.toFixed(2)}`, "Price"]}
              labelFormatter={(value) => monthNumberToName[Number(value)] || value}
            />
            <Line
              type="monotone"
              dataKey="adjusted_avg_price"
              stroke="#2196F3"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props
                if (!cx || !cy) return null

                // Add the pink marker for the current month
                if (Number(payload.booking_month) === currentMonth) {
                  return (
                    <g transform={`translate(${cx - 16}, ${cy - 16})`}>
                      <image
                        href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%202085661501%202-9quPcXbyLpJjGizoJpSBNY64qULej8.svg"
                        width={24}
                        height={24}
                        x={0}
                        y={0}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </g>
                  )
                }
                // Regular dots for other points
                return <circle cx={cx} cy={cy} r={4} fill="#2196F3" stroke="none" />
              }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

