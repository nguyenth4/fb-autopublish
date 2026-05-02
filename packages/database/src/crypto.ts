import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-cbc' as const
const IV_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('[crypto] ENCRYPTION_KEY environment variable is not set')
  }
  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
        `Got ${keyHex.length} characters.\n` +
        `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    )
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt plaintext → "iv_hex:ciphertext_hex"
 * Random IV per call — safe to store directly in DB column
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt "iv_hex:ciphertext_hex" → plaintext
 * Throws if format invalid or key is wrong
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 2) {
    throw new Error('[crypto] Invalid ciphertext format. Expected "iv_hex:data_hex"')
  }
  const [ivHex, encryptedHex] = parts as [string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const encryptedData = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString('utf8')
}

export const _test = {
  isValidKeyFormat: (hex: string) =>
    hex.length === KEY_LENGTH * 2 && /^[0-9a-f]+$/i.test(hex),
}
