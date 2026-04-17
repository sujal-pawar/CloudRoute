import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type CurrencyFormatOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function formatCurrency(value: number, options: CurrencyFormatOptions = {}) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  })

  return formatter.format(value)
}

export function formatPercent(value: number, maximumFractionDigits = 1) {
  const sign = value > 0 ? "+" : ""
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)

  return `${sign}${formatted}%`
}

type DateFormatInput = Date | string | number

export function formatDate(value: DateFormatInput, locale = "en-US") {
  const date = value instanceof Date ? value : new Date(value)

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date)
}
