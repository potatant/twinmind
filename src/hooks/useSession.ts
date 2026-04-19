import { useState, useCallback, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import type { Settings, TranscriptChunk, SuggestionBatch, ChatMessage, Suggestion } from '../types'
import { transcribeAudio, generateSuggestions, getDetailedAnswer, streamChatResponse } from '../lib/groq'
import { useAudioRecorder } from './useAudioRecorder'

export function useSession(settings: Settings) {
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
  const [batches, setBatches] = useState<SuggestionBatch[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStart] = useState(() => Date.now())

  const recorder = useAudioRecorder()

  // Refs for stable access inside async callbacks and intervals
  const transcriptRef = useRef<TranscriptChunk[]>([])
  const settingsRef = useRef<Settings>(settings)
  const chatRef = useRef<ChatMessage[]>([])
  const isRefreshingRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  transcriptRef.current = transcript
  settingsRef.current = settings
  chatRef.current = chat

  const getFullTranscript = useCallback(
    () => transcriptRef.current.map((c) => c.text).join(' '),
    []
  )

  const doRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    const s = settingsRef.current

    if (!s.groqApiKey) {
      setError('Please add your Groq API key in Settings.')
      return
    }

    isRefreshingRef.current = true

    // 1. Capture and transcribe the latest audio chunk
    if (recorder.isRecording) {
      const chunk = recorder.captureChunk()
      if (chunk && chunk.size > 0) {
        setIsTranscribing(true)
        try {
          const text = await transcribeAudio(chunk, s)
          if (text) {
            const newChunk: TranscriptChunk = { id: uuid(), text, timestamp: Date.now() }
            transcriptRef.current = [...transcriptRef.current, newChunk]
            setTranscript([...transcriptRef.current])
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed')
          isRefreshingRef.current = false
          setIsTranscribing(false)
          return
        }
        setIsTranscribing(false)
      }
    }

    // 2. Generate suggestions from the latest transcript
    const fullText = transcriptRef.current.map((c) => c.text).join(' ')
    if (!fullText.trim()) {
      isRefreshingRef.current = false
      return
    }

    setIsSuggesting(true)
    try {
      const suggestions = await generateSuggestions(fullText, s)
      const batchId = uuid()
      const batch: SuggestionBatch = {
        id: batchId,
        suggestions: suggestions.map((sg) => ({ ...sg, id: uuid(), batchId })),
        timestamp: Date.now(),
      }
      setBatches((prev) => [batch, ...prev])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setIsSuggesting(false)
      isRefreshingRef.current = false
    }
  }, [recorder])

  // Keep a stable ref so timers always call the latest version of doRefresh
  const doRefreshRef = useRef(doRefresh)
  doRefreshRef.current = doRefresh

  const clearTimers = useCallback(() => {
    if (firstTimeoutRef.current) { clearTimeout(firstTimeoutRef.current); firstTimeoutRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      await recorder.start()
      setError(null)
      // Fire first refresh after 15s (enough audio to transcribe), then every interval
      const ms = settingsRef.current.refreshIntervalSeconds * 1000
      firstTimeoutRef.current = setTimeout(() => doRefreshRef.current(), 15_000)
      intervalRef.current = setInterval(() => doRefreshRef.current(), ms)
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.')
    }
  }, [recorder])

  const stopRecording = useCallback(async () => {
    clearTimers()
    // Capture and transcribe any remaining audio before stopping
    if (recorder.isRecording && settingsRef.current.groqApiKey) {
      const chunk = recorder.captureChunk()
      if (chunk && chunk.size > 0) {
        try {
          const text = await transcribeAudio(chunk, settingsRef.current)
          if (text) {
            const newChunk: TranscriptChunk = { id: uuid(), text, timestamp: Date.now() }
            transcriptRef.current = [...transcriptRef.current, newChunk]
            setTranscript([...transcriptRef.current])
          }
        } catch {
          // best effort
        }
      }
    }
    recorder.stop()
  }, [recorder, clearTimers])

  const clickSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      const s = settingsRef.current
      if (!s.groqApiKey) return

      const userMsg: ChatMessage = {
        id: uuid(),
        role: 'user',
        content: `[${suggestion.type}] ${suggestion.preview}`,
        timestamp: Date.now(),
      }
      const assistantId = uuid()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      setChat((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)

      try {
        const answer = await getDetailedAnswer(suggestion, getFullTranscript(), s)
        setChat((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: answer } : m))
        )
      } catch (err) {
        setChat((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [getFullTranscript]
  )

  const sendChatMessage = useCallback(
    async (text: string) => {
      const s = settingsRef.current
      if (!s.groqApiKey || !text.trim()) return

      const userMsg: ChatMessage = {
        id: uuid(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      }
      const assistantId = uuid()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      const messagesForApi = [...chatRef.current, userMsg]
      setChat((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)

      try {
        const gen = streamChatResponse(messagesForApi, getFullTranscript(), s)
        let accumulated = ''
        for await (const chunk of gen) {
          accumulated += chunk
          const snapshot = accumulated
          setChat((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
          )
        }
      } catch (err) {
        setChat((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [getFullTranscript]
  )

  return {
    transcript,
    batches,
    chat,
    isRecording: recorder.isRecording,
    isTranscribing,
    isSuggesting,
    isStreaming,
    error,
    sessionStart,
    startRecording,
    stopRecording,
    doRefresh,
    clickSuggestion,
    sendChatMessage,
  }
}
