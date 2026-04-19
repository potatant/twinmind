import type { Settings } from '../types'

const SETTINGS_KEY = 'twinmind_settings'

export const DEFAULT_SUGGESTION_PROMPT = `You are a real-time meeting copilot. Analyze the conversation transcript and generate exactly 3 high-value suggestions for the participant.

Choose suggestion types based on what is most useful RIGHT NOW in the conversation:
- QUESTION: a sharp, specific question they could ask to advance the discussion
- TALKING_POINT: a relevant fact, stat, or perspective worth raising right now
- ANSWER: a direct answer to a question that was just raised in the conversation
- FACT_CHECK: verification or important context on a specific claim that was made
- CLARIFICATION: useful background or definition for something that was mentioned

Rules:
- Read the MOST RECENT part of the transcript to understand the current moment
- If someone just asked a question, lead with an ANSWER
- If a factual claim was made, consider a FACT_CHECK
- Always include at least one QUESTION to move the dialogue forward
- Make the preview immediately useful on its own — it should deliver value even without clicking
- Be specific to what was actually said — generic suggestions are worthless
- Vary the types; never give 3 of the same kind

Return ONLY valid JSON (no markdown, no explanation):
{"suggestions": [{"type": "QUESTION|TALKING_POINT|ANSWER|FACT_CHECK|CLARIFICATION", "preview": "1-2 sentence immediately useful information", "detail": "3-6 sentence comprehensive, actionable response"}]}`

export const DEFAULT_DETAIL_PROMPT = `You are an AI meeting copilot providing in-depth information during a live conversation. The user clicked a suggestion card to learn more.

Provide a thorough, well-structured response using the full meeting context. Use bullet points or short sections where they aid clarity. Be specific, actionable, and directly relevant to what is being discussed.`

export const DEFAULT_CHAT_PROMPT = `You are a live meeting copilot assistant with full access to the ongoing conversation transcript. Help the user with any questions, analyses, or tasks related to their meeting.

Be concise but thorough. Reference specific things from the transcript when relevant. Use markdown formatting (bullet points, bold, headers) where it aids clarity.`

export const DEFAULT_SETTINGS: Settings = {
  groqApiKey: '',
  model: 'openai/gpt-oss-120b',
  whisperModel: 'whisper-large-v3',
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  detailPrompt: DEFAULT_DETAIL_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_PROMPT,
  suggestionContextChars: 3000,
  detailContextChars: 8000,
  refreshIntervalSeconds: 30,
}

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
