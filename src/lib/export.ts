import type { TranscriptChunk, SuggestionBatch, ChatMessage } from '../types'

export function exportSession(
  transcript: TranscriptChunk[],
  batches: SuggestionBatch[],
  chat: ChatMessage[],
  sessionStart: number
): void {
  const data = {
    sessionStart: new Date(sessionStart).toISOString(),
    exportedAt: new Date().toISOString(),
    transcript: transcript.map((c) => ({
      timestamp: new Date(c.timestamp).toISOString(),
      text: c.text,
    })),
    suggestionBatches: batches.map((b) => ({
      timestamp: new Date(b.timestamp).toISOString(),
      suggestions: b.suggestions.map((s) => ({
        type: s.type,
        preview: s.preview,
        detail: s.detail,
      })),
    })),
    chat: chat.map((m) => ({
      timestamp: new Date(m.timestamp).toISOString(),
      role: m.role,
      content: m.content,
    })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
