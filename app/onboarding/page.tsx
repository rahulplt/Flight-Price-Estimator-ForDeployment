"use client"

import { useState } from "react"
import { UserInfo } from "./steps/user-info"
import { TravelPreferences } from "./steps/travel-preferences"
import { PriceAlerts } from "./steps/price-alerts"
import { PaymentInfo } from "./steps/payment-info"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const steps = [
  { title: "User Information", component: UserInfo },
  { title: "Travel Preferences", component: TravelPreferences },
  { title: "Price Alerts", component: PriceAlerts },
  { title: "Payment Information", component: PaymentInfo },
]

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})

  const CurrentStepComponent = steps[currentStep].component

  const handleNext = (data: any) => {
    setFormData((prev) => ({ ...prev, ...data }))
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = () => {
    // Here you would typically send the formData to your backend
    console.log("Form submitted:", formData)
    // Redirect to dashboard or show success message
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Welcome to Paylater Travel</h1>
      <Progress value={((currentStep + 1) / steps.length) * 100} className="w-full" />
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
      </div>
      <CurrentStepComponent onNext={handleNext} data={formData} />
      <div className="flex justify-between mt-6">
        {currentStep > 0 && (
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button onClick={handleSubmit} className="ml-auto">
            Submit
          </Button>
        )}
      </div>
    </div>
  )
}

