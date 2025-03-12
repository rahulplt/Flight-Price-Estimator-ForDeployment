"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { iataData, type IATACode } from "@/utils/iataData"
import { extractIataCode } from "@/utils/extractIataCode"

interface ArrivalsSearchProps {
  value: string
  onChange: (value: string, iataCode: string | null) => void
}

export function ArrivalsSearch({ value, onChange }: ArrivalsSearchProps) {
  const [query, setQuery] = useState(value)
  const [filteredResults, setFilteredResults] = useState<IATACode[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setQuery(inputValue)

    // Filter results
    const results = iataData
      .filter((item) => {
        const searchStr = inputValue.toLowerCase()
        return item.code.toLowerCase().includes(searchStr) || item.name.toLowerCase().includes(searchStr)
      })
      .slice(0, 10)

    setFilteredResults(results)
    setIsOpen(inputValue.length > 0)
    setSelectedIndex(-1)

    // Try to find exact match in iataData
    const exactMatch = iataData.find(item => 
      `${item.name} (${item.code})`.toLowerCase() === inputValue.toLowerCase()
    )

    if (exactMatch) {
      // If exact match found, use its code
      onChange(inputValue, exactMatch.code)
    } else {
      // Try to extract IATA code from input or set to null
      const match = inputValue.match(/\(([A-Z]{3})\)/)
      const iataCode = match ? match[1] : null
      onChange(inputValue, iataCode)
    }
  }

  const handleSelect = (item: IATACode) => {
    // Format: "City (IATA)"
    const formattedValue = `${item.name} (${item.code})`
    setQuery(formattedValue)
    onChange(formattedValue, item.code)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
          handleSelect(filteredResults[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  // Format the display value to ensure consistency
  const displayValue = query.includes("(") ? query : query.trim()

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="e.g. DPS or Bali"
        className="w-full"
      />
      {isOpen && filteredResults.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-lg z-50"
        >
          {filteredResults.map((item, index) => (
            <li
              key={item.code}
              onClick={() => handleSelect(item)}
              className={`cursor-pointer px-4 py-2 hover:bg-gray-100
                ${index === selectedIndex ? "bg-gray-100" : ""}`}
            >
              <div className="flex justify-between">
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-500">{item.code}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

