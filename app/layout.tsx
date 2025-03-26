import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GTMProvider from "@/components/GTMProvider"; // Adjust the path if needed

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flight Price Estimator",
  description: "Estimate the best time to buy your flight tickets",
  generator: "v0.dev",
  icons: {
    icon: '/favicon updated.png',
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
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
