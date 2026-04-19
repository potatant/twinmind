import { useRef, useState, useCallback } from 'react'

function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export interface AudioRecorderReturn {
  isRecording: boolean
  start: () => Promise<void>
  stop: () => void
  captureChunk: () => Blob | null
}

export function useAudioRecorder(): AudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start(1000) // collect a blob every second
    setIsRecording(true)
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop()
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    chunksRef.current = []
    setIsRecording(false)
  }, [])

  const captureChunk = useCallback((): Blob | null => {
    const recorder = recorderRef.current
    if (!recorder || chunksRef.current.length === 0) return null

    const captured = [...chunksRef.current]
    chunksRef.current = []

    return new Blob(captured, { type: recorder.mimeType || 'audio/webm' })
  }, [])

  return { isRecording, start, stop, captureChunk }
}
