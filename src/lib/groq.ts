import type { Settings, Suggestion, ChatMessage, SuggestionType } from '../types'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

/** Extract JSON from a model response that may be wrapped in markdown fences. */
function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) return obj[0]
  return text
}

function getMimeExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

export async function transcribeAudio(audioBlob: Blob, settings: Settings): Promise<string> {
  const ext = getMimeExtension(audioBlob.type)
  const formData = new FormData()
  formData.append('file', audioBlob, `audio.${ext}`)
  formData.append('model', settings.whisperModel)
  formData.append('response_format', 'json')
  formData.append('language', 'en')

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.groqApiKey}` },
    body: formData,
  })

  if (!res.ok) throw new Error(`Transcription failed: ${await res.text()}`)
  const data = await res.json() as { text?: string }
  return (data.text ?? '').trim()
}

export async function generateSuggestions(
  fullTranscript: string,
  settings: Settings
): Promise<Suggestion[]> {
  const context = fullTranscript.slice(-settings.suggestionContextChars)

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: settings.suggestionPrompt },
        {
          role: 'user',
          content: `Current conversation transcript:\n\n${context}\n\nGenerate 3 suggestions based on the most recent context.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    // Surface the Groq error message directly so the user knows what went wrong
    let msg = `Suggestions API error (${res.status})`
    try { msg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  const raw = data.choices[0]?.message?.content ?? '{}'
  const content = extractJson(raw)

  let parsed: { suggestions?: { type: string; preview: string; detail: string }[] }
  try {
    parsed = JSON.parse(content) as typeof parsed
  } catch {
    throw new Error(`Could not parse suggestions JSON. Raw response: ${raw.slice(0, 200)}`)
  }

  return (parsed.suggestions ?? []).map(
    (s: { type: string; preview: string; detail: string }, i: number) => ({
      id: `${Date.now()}-${i}`,
      type: (s.type as SuggestionType) ?? 'QUESTION',
      preview: s.preview ?? '',
      detail: s.detail ?? '',
      timestamp: Date.now(),
      batchId: '',
    })
  )
}

export async function getDetailedAnswer(
  suggestion: { type: string; preview: string },
  transcript: string,
  settings: Settings
): Promise<string> {
  const context = transcript.slice(-settings.detailContextChars)

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: settings.detailPrompt },
        {
          role: 'user',
          content: `Full conversation transcript:\n\n${context}\n\nClicked suggestion:\nType: ${suggestion.type}\nPreview: ${suggestion.preview}\n\nProvide a comprehensive, helpful response on this topic.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) throw new Error(`Detail answer failed: ${await res.text()}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}

export async function* streamChatResponse(
  messages: ChatMessage[],
  transcript: string,
  settings: Settings
): AsyncGenerator<string> {
  const context = transcript.slice(-settings.detailContextChars)
  const systemContent = `${settings.chatSystemPrompt}\n\nCURRENT TRANSCRIPT:\n${context}`

  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) throw new Error(`Chat failed: ${await res.text()}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const chunk = JSON.parse(data) as { choices: { delta: { content?: string } }[] }
        const content = chunk.choices[0]?.delta?.content ?? ''
        if (content) yield content
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}
