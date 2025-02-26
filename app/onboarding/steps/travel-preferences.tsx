"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  favoriteDestination: z.string().min(2, {
    message: "Favorite destination must be at least 2 characters.",
  }),
  preferredAirline: z.string().min(2, {
    message: "Please select a preferred airline.",
  }),
})

const airlines = ["American Airlines", "Delta Air Lines", "United Airlines", "Southwest Airlines", "Other"]

export function TravelPreferences({ onNext, data }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      favoriteDestination: data.favoriteDestination || "",
      preferredAirline: data.preferredAirline || "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    onNext(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="favoriteDestination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Favorite Destination</FormLabel>
              <FormControl>
                <Input placeholder="Paris, France" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredAirline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Airline</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an airline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {airlines.map((airline) => (
                    <SelectItem key={airline} value={airline}>
                      {airline}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Next</Button>
      </form>
    </Form>
  )
}

