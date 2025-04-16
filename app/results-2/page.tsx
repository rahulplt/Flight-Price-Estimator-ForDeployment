"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function Results2Page() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const fromCity = searchParams.get("from") || "Your city"
  const toCity = searchParams.get("to") || "Destination"

  // Navigate back to home
  const handleBack = () => {
    window.location.href = "/"
  }

  // On form submit, capture email & switch to "Submitted!" state
  const handleCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      // Push to dataLayer before making the API call
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "Email_submitted_customPrice",
        userEmail: email,
        fromCity: fromCity,
        toCity: toCity
      });

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        // If the server returned an error, log it
        const errorText = await response.text()
        console.error("Failed to subscribe:", errorText)
      }

      // Flip to "Submitted!" state
      setIsSubmitted(true)
      setEmail("")
    } catch (error) {
      console.error("Network error:", error)
    }
  }

  return (
    <main className="min-h-screen bg-[#1c1f2e] pt-4 px-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" className="mb-4 text-white" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="space-y-8">
          <div className="rounded-[32px] border border-blue-500/30 bg-[#282B3C] p-8 max-w-[840px] mx-auto">
            <h1 className="text-3xl font-bold text-[#4ADE80] mb-2">We're not that good yet.</h1>
            <p className="text-lg mb-6 text-gray-300">
              We don't have the data for this route, drop your email and we'll send you over a customised price.
            </p>

            <div className="flex items-center justify-center space-x-4 mb-6">
              <span className="text-xl font-semibold">{fromCity}</span>
              <div className="relative w-8 h-8">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector-vh1Uae9QuVQDzNBwHJ2ymmHRbB8Jge.svg"
                  alt="Airplane"
                  width={32}
                  height={32}
                  className="rotate-0"
                />
              </div>
              <span className="text-xl font-semibold">{toCity}</span>
            </div>

            <form onSubmit={handleCustomPrice} className="space-y-4">
              {/* Only show input if not submitted yet */}
              {!isSubmitted && (
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setIsSubmitted(false) // reset if user edits the email
                  }}
                  className="bg-white text-black"
                  required
                />
              )}

              <Button
                type="submit"
                disabled={isSubmitted}
                className="bg-[#c1ff72] text-black hover:bg-[#a8e665] h-12 px-8 text-lg font-medium rounded-2xl w-full"
              >
                {isSubmitted ? "Submitted!" : "Get Customised Price"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
