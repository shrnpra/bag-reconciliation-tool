interface CountryFilterProps {
  value?: string
  onChange: (country?: string) => void
}

const COUNTRIES = [
  { value: '', label: 'All Countries' },
  { value: 'UAE', label: 'UAE' },
  { value: 'SAUDI_ARABIA', label: 'Saudi Arabia' },
  { value: 'EGYPT', label: 'Egypt' },
]

export default function CountryFilter({ value, onChange }: CountryFilterProps) {
  return (
    <select
      aria-label="Filter by country"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {COUNTRIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  )
}
