import { useEffect, useRef } from 'react'
import type { TranscriptChunk } from '../types'

interface Props {
  transcript: TranscriptChunk[]
  isRecording: boolean
  isTranscribing: boolean
  onStart: () => void
  onStop: () => void
}

export function TranscriptPanel({ transcript, isRecording, isTranscribing, onStart, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Transcript</h2>
        {isTranscribing && (
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Transcribing…
          </span>
        )}
      </div>

      {/* Transcript text */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm text-gray-700 leading-relaxed">
        {transcript.length === 0 ? (
          <p className="text-gray-400 text-center mt-8 text-sm">
            {isRecording ? 'Listening… transcript will appear in ~30 s' : 'Press the mic to start recording'}
          </p>
        ) : (
          transcript.map((chunk) => (
            <div key={chunk.id}>
              <span className="text-[10px] text-gray-400 block mb-0.5">
                {new Date(chunk.timestamp).toLocaleTimeString()}
              </span>
              <p>{chunk.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic button */}
      <div className="px-4 py-3 border-t border-gray-100 flex justify-center">
        <button
          onClick={isRecording ? onStop : onStart}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
          }`}
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-sm bg-white" />
              Stop Recording
            </>
          ) : (
            <>
              <MicIcon />
              Start Recording
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v7a2 2 0 0 1-4 0V5z" />
      <path d="M5 11a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 0 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z" />
    </svg>
  )
}
