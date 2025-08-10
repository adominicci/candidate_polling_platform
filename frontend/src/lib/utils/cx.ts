import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Class name utility function that combines clsx and tailwind-merge
 * for conditional class names with proper Tailwind CSS deduplication
 */
export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Alias for cx function to match common naming conventions
 */
export const cn = cx