"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function Results2Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromCity = searchParams.get("from") || "Your city"
  const toCity = searchParams.get("to") || "Destination"

  const handleCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      alert("Please enter an email address")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        // Retrieve error text for debugging purposes
        const errorText = await response.text()
        throw new Error("Failed to subscribe: " + errorText)
      }

      alert("Success! We will send you a customised price soon.")
      setEmail("")
    } catch (error) {
      console.error("Submit error:", error)
      alert("Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    // Force a hard navigation to the home page
    window.location.href = "/"
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
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-black"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#c1ff72] text-black hover:bg-[#a8e665] h-12 px-8 text-lg font-medium rounded-2xl w-full"
              >
                {isSubmitting ? "Submitting..." : "Get Customised Price"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
