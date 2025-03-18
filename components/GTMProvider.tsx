"use client";

import Script from "next/script";
import React from "react";

interface GTMProviderProps {
  children: React.ReactNode;
}

export default function GTMProvider({ children }: GTMProviderProps) {
  return (
    <>
      {/* Google Analytics (gtag.js) */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-Q2KV8PSEVF"
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Q2KV8PSEVF');
          `,
        }}
      />

      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
              var f = d.getElementsByTagName(s)[0],
                  j = d.createElement(s),
                  dl = l!='dataLayer'?'&l='+l:'';
              j.async = true;
              j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PK5C6LV');
          `,
        }}
      />

      {children}
    </>
  );
}
