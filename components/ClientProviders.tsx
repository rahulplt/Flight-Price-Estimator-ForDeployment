// components/ClientProviders.tsx
"use client";

import GoogleAnalyticsScripts from "@/components/GoogleAnalyticsScripts";
import Analytics from "@/components/analytics";

export default function ClientProviders() {
  return (
    <>
      <GoogleAnalyticsScripts />
      <Analytics />
    </>
  );
}
