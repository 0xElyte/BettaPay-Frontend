import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultRoute(role?: string | null) {
  return role === 'admin' ? '/overview' : '/dashboard';
}
