// Supabase server client for API routes
import { createServerClient as createSsrClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'https://evpepimbliuuyuugdxwq.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODQ2MTEsImV4cCI6MjEwMTk2MDYxMX0.VMJX8raAx_HwpAxT-XO9rgezVdFChLiEkvdHZad4ODE'
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NDYxMSwiZXhwIjoyMTAxOTYwNjExfQ.Ba1S1AhceA-dpC4uuiSKjQQChg9iuPzikiqIGgUbtvk'

// Anon-key client bound to the request cookies. Use for reads (RLS-enforced).
export function createServerClient() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

  return createSsrClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Handle cookie setting error in server components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Handle cookie removal error in server components
        }
      },
    },
    global: {
      fetch: (url: string | URL | Request, options?: RequestInit) => fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}

// Service-role client. Bypasses RLS. SERVER-ONLY — never import from a Client
// Component. Used by admin API routes for writes (guarded by the admin cookie).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url: string | URL | Request, options?: RequestInit) => fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}