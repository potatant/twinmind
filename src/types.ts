export type SuggestionType =
  | 'QUESTION'
  | 'TALKING_POINT'
  | 'ANSWER'
  | 'FACT_CHECK'
  | 'CLARIFICATION'

export interface Suggestion {
  id: string
  type: SuggestionType
  preview: string
  detail: string
  timestamp: number
  batchId: string
}

export interface SuggestionBatch {
  id: string
  suggestions: Suggestion[]
  timestamp: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface TranscriptChunk {
  id: string
  text: string
  timestamp: number
}

export interface Settings {
  groqApiKey: string
  model: string
  whisperModel: string
  suggestionPrompt: string
  detailPrompt: string
  chatSystemPrompt: string
  suggestionContextChars: number
  detailContextChars: number
  refreshIntervalSeconds: number
}
