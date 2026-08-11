// HMAC-signed admin session using the Web Crypto API.
// Works in BOTH the Next.js edge runtime (middleware) and Node (route handlers).

export const SESSION_COOKIE = 'admin_session'
const TTL_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const DEFAULT_AUTH_SECRET = '17a43dee3adc3341cb3c2e4b19da2db915cbad90db021ca04b97d25052d41422'
const DEFAULT_ADMIN_PASSWORD = '9hc00ZZ633!'

export type SessionPayload = { role: 'admin'; exp: number }

function getSecret(): string {
  const s = (process.env.AUTH_SECRET || '').trim() || DEFAULT_AUTH_SECRET
  return s
}

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesFromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function toBufferSource(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await deriveKey()
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const sig = b64urlFromBytes(new Uint8Array(sigBuf))
  return `${body}.${sig}`
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  let given: Uint8Array
  try {
    given = bytesFromB64url(sig)
  } catch {
    return null
  }

  const key = await deriveKey()
  let ok = false
  try {
    ok = await crypto.subtle.verify('HMAC', key, toBufferSource(given), new TextEncoder().encode(body))
  } catch {
    return null
  }
  if (!ok) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(bytesFromB64url(body)))
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
  if (payload.role !== 'admin') return null
  return payload
}

export function sessionTtl(): number {
  return TTL_DEFAULT_MS
}

export function isPasswordCorrect(password: string): boolean {
  const envExp = (process.env.ADMIN_PASSWORD || '').trim()
  const expected = envExp || DEFAULT_ADMIN_PASSWORD
  const cleanGiven = (password || '').trim()

  const a = new TextEncoder().encode(expected)
  const b = new TextEncoder().encode(cleanGiven)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
