"use client"

import * as React from "react"

import { DayPicker, DateRange } from "react-day-picker"
import "react-day-picker/dist/style.css"


import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultMonth = new Date()
  
  return (
    <div className="relative w-full p-0 m-0">
    <DayPicker
      showOutsideDays={showOutsideDays}
      defaultMonth={defaultMonth}
      className={cn("p-0 m-0 w-full", className)}
      classNames={{
        root: "p-0 m-0",
        months: "flex flex-col sm:flex-row sm:space-x-4 sm:space-y-0 w-full p-0 m-0",
        month: "w-full space-y-4 p-0 m-0",
        caption: "flex justify-center pt-1 relative items-center h-8 p-0 m-0",
        caption_label: "text-sm font-medium p-0 m-0",
        nav: "hidden",
        nav_button: "hidden",
        nav_button_previous: "hidden",
        nav_button_next: "hidden",
        table: "w-full border-collapse space-y-1 p-0 m-0",
        head_row: "flex w-full p-0 m-0",
        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center p-0",
        row: "flex w-full mt-2 p-0",
        cell: "text-center relative flex-1 p-0", 
        day: "h-8 w-8 p-0 font-normal mx-auto hover:bg-accent hover:text-accent-foreground rounded-none",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-white font-bold rounded-none",
        day_outside: "text-muted-foreground opacity-20",
        day_disabled: "text-muted-foreground opacity-20",
        ...classNames,
      }}
      {...props}
    />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
