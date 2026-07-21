import { useState, KeyboardEvent } from 'react'

interface BarcodeInputProps {
  onScan: (barcode: string) => void
  placeholder?: string
}

export default function BarcodeInput({ onScan, placeholder = 'Scan or enter barcode' }: BarcodeInputProps) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed) {
        onScan(trimmed)
        setValue('')
      }
    }
  }

  return (
    <input
      type="text"
      aria-label="Barcode input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  )
}
