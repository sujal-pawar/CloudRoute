import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import type { CloudCredentials } from "@/lib/types"

const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
let hasLoggedDevKeyWarning = false

export function encryptCloudCredentials(credentials: CloudCredentials): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`
}

export function decryptCloudCredentials(
  encryptedPayload: string | null | undefined
): CloudCredentials | null {
  if (!encryptedPayload) {
    return null
  }

  const [ivBase64, tagBase64, cipherBase64] = encryptedPayload.split(".")

  if (!ivBase64 || !tagBase64 || !cipherBase64) {
    throw new Error("Invalid encrypted credential payload format")
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(tagBase64, "base64")
  const encrypted = Buffer.from(cipherBase64, "base64")

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  return JSON.parse(plaintext) as CloudCredentials
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.CLOUD_CREDENTIALS_KEY

  if (!rawKey || !rawKey.trim()) {
    if (process.env.NODE_ENV !== "production") {
      if (!hasLoggedDevKeyWarning) {
        hasLoggedDevKeyWarning = true
        console.warn(
          "CLOUD_CREDENTIALS_KEY is not set. Falling back to a development-only key. Set CLOUD_CREDENTIALS_KEY in .env.local for stable encrypted credentials across restarts."
        )
      }

      const devFallbackSource =
        process.env.MONGODB_URI ||
        process.env.MONGODB_DB_NAME ||
        "cloudroute-dev-credentials-key"

      return createHash("sha256").update(devFallbackSource, "utf8").digest()
    }

    throw new Error(
      "CLOUD_CREDENTIALS_KEY is required in production to store cloud credentials securely."
    )
  }

  const normalized = rawKey.trim()

  try {
    const base64Key = Buffer.from(normalized, "base64")
    if (base64Key.length === 32) {
      return base64Key
    }
  } catch {
    // Non-base64 key is handled below.
  }

  return createHash("sha256").update(normalized, "utf8").digest()
}
