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

const DEFAULT_MODEL = "gemini-flash-latest"

export async function generateGeminiText(prompt: string, maxOutputTokens = 220): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
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
  })

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
