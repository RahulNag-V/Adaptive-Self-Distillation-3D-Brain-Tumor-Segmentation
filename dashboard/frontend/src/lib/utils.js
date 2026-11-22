import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for combining Tailwind CSS class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
