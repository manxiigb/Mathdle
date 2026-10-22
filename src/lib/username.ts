// Dominio reservado para ejemplos (RFC 2606): los correos internos nunca llegan a nadie real.
// Si Supabase lo rechazara con "email_address_invalid", cambia solo esta constante.
const LOGIN_DOMAIN = 'example.com'

// 3 a 20 caracteres: letras, números, espacios, _ . -
const USERNAME_RE = /^[\p{L}\p{N}\p{M} _.-]{3,20}$/u

export function cleanUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function usernameError(raw: string): string | null {
  if (!USERNAME_RE.test(cleanUsername(raw))) {
    return 'Usa entre 3 y 20 caracteres: letras, números, espacios, _ . -'
  }
  return null
}

// Mismo nombre (sin importar mayúsculas ni espacios extra) => mismo correo interno
export async function usernameToEmail(raw: string): Promise<string> {
  const key = cleanUsername(raw).normalize('NFKC').toLowerCase()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `u${hex.slice(0, 40)}@${LOGIN_DOMAIN}`
}