"use client";

import Script from "next/script";
import { GA_TRACKING_ID } from "@/lib/gtag";

export default function GoogleAnalyticsScripts() {
  if (!GA_TRACKING_ID) return null;

  const gtagInit = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_TRACKING_ID}', {
      page_path: window.location.pathname,
    });
  `;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: gtagInit,
        }}
      />
    </>
  );
}
