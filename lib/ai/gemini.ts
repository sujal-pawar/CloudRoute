import "server-only"

type GeminiPart = {
  text?: string
}

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[]
  }
}

type GeminiResponse = {
  candidates?: GeminiCandidate[]
}

const DEFAULT_MODEL = "gemini-1.5-flash"
const DEFAULT_TIMEOUT_MS = 12_000

export async function generateGeminiText(prompt: string, maxOutputTokens = 220): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const timeoutMs = parseTimeout(process.env.GEMINI_TIMEOUT_MS)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  let response: Response

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens,
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini request timed out after ${timeoutMs}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`Gemini request failed (${response.status}): ${details || response.statusText}`)
  }

  const payload = (await response.json()) as GeminiResponse
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  if (!text) {
    throw new Error("Gemini returned an empty response")
  }

  return text
}

function parseTimeout(rawTimeout: string | undefined): number {
  const parsed = Number.parseInt(rawTimeout ?? "", 10)

  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_TIMEOUT_MS
  }

  return parsed
}
