import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GTMProvider from "@/components/GTMProvider"; // Adjust the path if needed

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flight Price Predictor",
  description: "Predict the best time to buy your flight tickets",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Keep any meta tags or link tags here */}
      </head>
      <body className={inter.className}>
        <GTMProvider>
          {children}
        </GTMProvider>
      </body>
    </html>
  );
}
