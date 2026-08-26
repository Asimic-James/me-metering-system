// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ==================== BRAND / DESIGN TOKENS ====================
        // Single source of truth for this app's colour system — components
        // should use these (`bg-brand-600`, `text-brand-700`, etc.) rather
        // than picking one-off Tailwind colours or gradients directly.
        //
        // `brand` is this app's existing primary (matches index.html's
        // `<meta name="theme-color" content="#2563EB">` and the blue
        // already used throughout the UI) — not a new colour, just now
        // named and centralized instead of repeated ad hoc everywhere.
        // 600 = primary, 700 = hover/active.
        //
        // Semantic roles (all standard Tailwind gray/green/amber/red —
        // used as-is, not redefined, so they stay distinct from `brand`):
        //   background   gray-50   / dark:gray-950
        //   surface      white     / dark:gray-800
        //   border       gray-200  / dark:gray-700
        //   text         gray-900  / dark:white
        //   muted text   gray-500  / dark:gray-400
        //   success      green-*   (also: COMPLETED status)
        //   warning      amber-*   (also: PAID / awaiting-action status)
        //   error        red-*     (also: FAILED status)
        //   info/neutral slate-*   (also: INITIATED status — deliberately
        //                NOT blue, so a status badge is never visually
        //                confused with the brand/primary-action colour)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        }
      }
    },
  },
  plugins: [],
}