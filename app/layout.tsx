import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GTMProvider from "@/components/GTMProvider"; // Adjust the path if needed

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flight Price Predictor & History | PayLater Travel",
  description: "Use our flight price estimator tool to predict the cost of your flight and decide whether you want to book now before it goes up. We used historical price trends help you track when airline prices go down.",
  generator: "v0.dev",
  icons: {
    icon: [
      { url: '/favicon updated.png', type: 'image/png' },
      { url: '/Favicon 48x48 SERP.png', sizes: '48x48', type: 'image/png' }
    ],
  },
  alternates: {
    canonical: 'https://tools.paylatertravel.com.au/',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon updated.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/Favicon 48x48 SERP.png" />
        {/* Remove these two meta tags */}
        {/* <meta name="robots" content="noindex" /> */}
        {/* <meta name="googlebot" content="noindex" /> */}
      </head>
      <body className={`${inter.className} min-h-screen w-full overflow-x-hidden`}>
        <GTMProvider>
          {children}
        </GTMProvider>
      </body>
    </html>
  );
}
