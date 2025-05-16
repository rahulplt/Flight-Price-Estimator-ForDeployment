"use client";

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Cross2Icon } from "@radix-ui/react-icons"
import { ArrivalsSearch } from "@/components/ArrivalsSearch"
import { australianCities, cityToFlag } from "@/utils/city-flags"
import { saveSearchData, type FlightSearchData } from "@/utils/storage"
import { getFirstMonthNumber } from "@/utils/getFirstMonthNumber"
import type { DateRange } from "react-day-picker"
import "../styles/globals.css"
import { Navbar } from "./components/Navbar"

// Optional: Let TypeScript know about dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Extract IATA code from city name
const extractIataCode = (city: string): string => {
  const match = city.match(/\(([A-Z]{3})\)$/);
  if (match && match[1]) {
    return match[1];
  }

  const cityToIata: { [key: string]: string } = {
    "Sydney (SYD)": "SYD",
    "Melbourne (MEL)": "MEL",
    "Brisbane (BNE)": "BNE",
    "Perth (PER)": "PER",
    "Adelaide (ADL)": "ADL",
    "Gold Coast (OOL)": "OOL",
  };

  return cityToIata[city] || "SYD";
};

export default function HomePage() {
  const router = useRouter();
  const [departureCity, setDepartureCity] = useState<string>(australianCities[0]);
  const [arrivalCity, setArrivalCity] = useState("");
  const [arrivalIataCode, setArrivalIataCode] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    console.log(">>> handleSubmit called with:", {
      departureCity,
      arrivalCity,
      arrivalIataCode,
      dateRangeFrom: dateRange?.from,
      dateRangeTo: dateRange?.to,
    });

    if (!dateRange?.from) {
      toast({
        title: "Missing Date",
        description: "Please select a departure date.",
        variant: "destructive",
      });
      return;
    }

    if (!arrivalIataCode) {
      toast({
        title: "Invalid Destination",
        description: "Please select a valid destination with an IATA code.",
        variant: "destructive",
      });
      return;
    }

    const searchData: FlightSearchData = {
      departureCity,
      arrivalCity,
      date: JSON.stringify(dateRange),
    };
    saveSearchData(searchData);

    const dateRangeString = `${format(dateRange.from, "MMM d, yyyy")} - ${format(
      dateRange.to || dateRange.from,
      "MMM d, yyyy"
    )}`;
    const monthNum = getFirstMonthNumber(dateRangeString);

    console.log(">>> Extracted monthNum:", monthNum);

    if (!monthNum) {
      toast({
        title: "Error",
        description: "Failed to extract month number. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const departureDate = new Date(dateRange.from);
      const departureMonth = departureDate.getMonth() + 1;
      const departureYear = departureDate.getFullYear();

      const departureIataCode = extractIataCode(departureCity);
      console.log(
        ">>> departureIataCode:",
        departureIataCode,
        "arrivalIataCode:",
        arrivalIataCode
      );

      // If it's the current month/year, redirect to results-1
      if (departureMonth === currentMonth && departureYear === currentYear) {
        const params = new URLSearchParams({
          from: departureCity,
          to: arrivalCity,
          toIata: arrivalIataCode || "",
          departDate: dateRange.from.toISOString(),
          returnDate: (dateRange.to || dateRange.from).toISOString(),
          redirect: "results-1",
          departureIata: departureIataCode,
        });
        console.log(">>> Navigating to /loading with current month:", params.toString());
        router.push(`/loading?${params.toString()}`);
        return;
      }

      // For a future month, build the API URL
      const apiUrl = `/api/flight-prices?${new URLSearchParams({
        destination_iata: arrivalIataCode || "",
        departure_month: monthNum.toString(),
        num_travelers: "1",
      }).toString()}`;

      console.log(">>> Constructed apiUrl:", apiUrl);

      const params = new URLSearchParams({
        from: departureCity,
        to: arrivalCity,
        toIata: arrivalIataCode || "",
        departDate: dateRange.from.toISOString(),
        returnDate: (dateRange.to || dateRange.from).toISOString(),
        departureIata: departureIataCode,
        generatedUrl: apiUrl,
      });

      console.log(">>> Final query params for /loading:", params.toString());
      router.push(`/loading?${params.toString()}`);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: "Failed to fetch flight prices. Please try again.",
        variant: "destructive",
      });
    }
  }, [departureCity, arrivalCity, arrivalIataCode, dateRange, router]);

  const handleArrivalCityChange = (value: string, iataCode: string | null) => {
    console.log(">>> handleArrivalCityChange called with:", { value, iataCode });
    setArrivalCity(value);
    setArrivalIataCode(iataCode);
  };

  const handleSearch = () => {
    // Push to GTM: estimation started
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "estimation_started",
      departure_city: departureCity,
      arrival_city: arrivalCity,
      departure_date: dateRange?.from?.toLocaleDateString("en-CA"), // 2025-12-18
      return_date: (dateRange?.to || dateRange?.from)?.toLocaleDateString("en-CA"),
    });

    handleSubmit();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary p-4 pt-8 sm:p-6 sm:pt-12 md:p-8 md:pt-16 lg:p-4 lg:pt-12">
        <div className="mx-auto max-w-[1200px] rounded-lg bg-white p-4 sm:p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
            {/* Left Column */}
            <div className="space-y-8 pb-24 md:pb-0">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl lg:text-4xl font-bold">Flight Price Estimator</h1>
                <h2 className="text-lg lg:text-xl font-semibold flex items-center justify-center gap-2">
                  Find out the best time to book
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="rounded-full w-5 h-5 inline-flex items-center justify-center text-sm border border-gray-300 hover:bg-gray-100"
                        aria-label="Show how it works"
                      >
                        ⓘ
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 text-left bg-[#1c1f2e] text-white rounded-xl border border-white/20 relative">
                      <button 
                        onClick={() => setIsPopoverOpen(false)}
                        className="absolute top-2 right-2 text-white/70 hover:text-white"
                        aria-label="Close popup"
                      >
                        ✕
                      </button>
                      <div className="space-y-4 pb-2">
                        <h3 className="font-semibold text-2xl text-center">How it works</h3>
                        <div className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold min-w-[1.5rem] text-sm">1.</span>
                            <p className="text-sm">Select the destination you want to travel to ✈️</p>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold min-w-[1.5rem] text-sm">2.</span>
                            <p className="text-sm">See if flight ticket prices are going to get cheaper or not </p>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold min-w-[1.5rem] text-sm">3.</span>
                            <p className="text-sm">Get transported to our website to book your flight</p>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold min-w-[1.5rem] text-sm">4.</span>
                            <p className="text-sm">Enter your email for exclusive access to offers and updates </p>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Departure city</label>
                  <Select
                    value={departureCity}
                    onValueChange={(city) => {
                      setDepartureCity(city);

                      // Push to dataLayer for GTM
                      window.dataLayer = window.dataLayer || [];
                      window.dataLayer.push({
                        event: "select_departure_city",
                        city_name: city,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {australianCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          <span className="flex items-center gap-2">
                            <span>{cityToFlag[city]}</span>
                            <span>{city}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Arrival city</label>
                  <ArrivalsSearch value={arrivalCity} onChange={handleArrivalCityChange} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Select dates</label>
                    <div className="flex gap-2">
                      <button
                        className="p-1 text-gray-600 hover:text-gray-900"
                        onClick={() =>
                          setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                        }
                      >
                        ←
                      </button>
                      <button
                        className="p-1 text-gray-600 hover:text-gray-900"
                        onClick={() =>
                          setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div className="relative rounded-md border calendar-wrapper max-w-[100%] overflow-hidden pt-0 md:pt-10 lg:pt-6 pb-2 md:pb-4 lg:pb-0">
                    <div className="px-12 sm:px-0">
                      <style jsx global>{`
                        .rdp {
                          --rdp-cell-size: 40px !important;
                          margin: 0 !important;
                        }
                        .rdp-day_selected {
                          background-color: #f3f4f6 !important;
                          color: black !important;
                        }
                        .rdp-day_range_start,
                        .rdp-day_range_end {
                          font-weight: bold !important;
                          background-color: #c1ff72 !important;
                          width: 100% !important;
                          border-radius: 0 !important;
                        }
                        .rdp-day_today {
                          border: 2px solid #c1ff72 !important;
                          font-weight: bold !important;
                        }
                        .rdp-button {
                          position: relative !important;
                          width: 100% !important;
                          height: var(--rdp-cell-size) !important;
                          padding: 0 !important;
                          margin: 0 !important;
                          display: flex !important;
                          justify-content: flex-start !important;
                          padding-left: 8px !important;
                          align-items: center !important;
                          border-radius: 0 !important;
                        }
                        .rdp-cell {
                          height: var(--rdp-cell-size) !important;
                          padding: 0 !important;
                          margin: 0 !important;
                          text-align: left !important;
                        }
                        .rdp-table {
                          margin: 0 !important;
                          max-width: 100% !important;
                        }
                        .rdp-head_cell {
                          font-weight: 500 !important;
                          font-size: 0.875rem !important;
                          height: 2rem !important;
                          padding: 0 !important;
                          text-align: left !important;
                          padding-left: 8px !important;
                        }
                        .rdp-tbody tr {
                          display: flex !important;
                          justify-content: space-between !important;
                          margin: 0.25rem 0 !important;
                        }
                        .rdp-month {
                          width: 100% !important;
                        }
                        .rdp-caption {
                          padding: 0 !important;
                          margin-bottom: 0.5rem !important;
                        }
                        @media (max-width: 640px) {
                          .calendar-wrapper .rdp-multiple_months {
                            display: flex !important;
                            flex-direction: column !important;
                            gap: 2rem !important; /* This 2rem gap controls the spacing between months */
                          }
                          .calendar-wrapper .flex.flex-col > .w-full.space-y-4.p-0:not(:first-child) {
                            margin-top: 2rem !important; /* This margin controls spacing between calendar sections */
                          }
                        }
                      `}</style>
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        month={month}
                        onMonthChange={setMonth}
                        showOutsideDays={false}
                        className="w-full scale-100 md:scale-90 origin-top p-0 m-0"
                        modifiersClassNames={{
                          selected: "bg-gray-100",
                          range_start: "font-bold bg-[#c1ff72]",
                          range_end: "font-bold bg-[#c1ff72]",
                          today: "font-bold",
                        }}
                        classNames={{
                          day_range_start: "bg-black text-white font-bold rounded-full w-9 h-9",
                          day_range_end: "bg-black text-white font-bold rounded-full w-9 h-9",
                          day_range_middle: "bg-[#c1ff72] text-black",
                        }}
                      />
                    </div>
                  </div>
                  {dateRange?.from && (
                    <p className="mt-2 text-sm text-gray-600">
                      {dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d, yyyy")} -{" "}
                          {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        <>Select return date</>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="w-full bg-[#c1ff72] text-black hover:bg-[#a8e665] h-12 text-sm sm:text-lg font-medium rounded-2xl whitespace-normal sm:whitespace-nowrap"
                  disabled={!dateRange?.from || !arrivalIataCode}
                >
                  <span className="text-xl sm:text-1.5xl">Check Prices</span>
                </Button>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col items-center justify-center">
              {/* Desktop: Show the full composite image */}
              <div className="hidden md:block w-full h-full max-h-[600px] relative">
                <img
                  src="/Front page right column v2.png"
                  alt="Flight price estimator information"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>

              {/* Mobile: Stack the cards and show the background image */}
              <div className="block md:hidden w-full relative min-h-[700px]">
                {/* Background image container with gradient overlay */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <img
                    src="/Group 2085661519.png"
                    alt="Beach background"
                    className="w-full h-full object-cover"
                    style={{ minHeight: '700px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
                </div>

                {/* Cards container with padding and spacing */}
                <div className="relative h-full flex flex-col items-center justify-between py-8 px-4">
                  <div className="flex flex-col items-center gap-6 w-[90%]">
                    <div className="w-full">
                      <img
                        src="/Graph example.png"
                        alt="Graph"
                        className="w-full rounded-2xl shadow-xl"
                      />
                    </div>
                    <div className="w-full">
                      <img
                        src="/temp bar example v2.png"
                        alt="Price bar"
                        className="w-full rounded-2xl shadow-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Force Tailwind to include dynamic calendar range styles */}
      <div className="hidden rdp-day_range_middle rdp-day_range_start rdp-day_range_end rdp-day_selected" />
    </>
  );
}
