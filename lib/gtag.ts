// lib/gtag.ts

// Add type declaration for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

// 1. Google Analytics 4 Measurement ID from .env.local
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || ""

// 2. Track a page view (used with router changes)
export const pageview = (url: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

// 3. Track custom events like clicks, form submissions etc.
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string
  category: string
  label: string
  value?: number
}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
    })
  }
}
