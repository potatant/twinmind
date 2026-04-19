import { useState } from 'react'
import type { Settings } from './types'
import { loadSettings, saveSettings } from './lib/storage'
import { exportSession } from './lib/export'
import { useSession } from './hooks/useSession'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionsPanel } from './components/SuggestionsPanel'
import { ChatPanel } from './components/ChatPanel'
import { SettingsModal } from './components/SettingsModal'

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(() => !loadSettings().groqApiKey)

  const session = useSession(settings)

  const handleSaveSettings = (s: Settings) => {
    saveSettings(s)
    setSettings(s)
    setShowSettings(false)
  }

  const handleExport = () => {
    exportSession(session.transcript, session.batches, session.chat, session.sessionStart)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
              <path d="M5 11a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 0 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-900">TwinMind</span>
          {session.isRecording && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={session.transcript.length === 0 && session.chat.length === 0}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            <ExportIcon />
            Export
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <SettingsIcon />
            Settings
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <main className="flex-1 grid grid-cols-3 gap-3 p-3 overflow-hidden min-h-0">
        <TranscriptPanel
          transcript={session.transcript}
          isRecording={session.isRecording}
          isTranscribing={session.isTranscribing}
          onStart={session.startRecording}
          onStop={session.stopRecording}
        />
        <SuggestionsPanel
          batches={session.batches}
          isSuggesting={session.isSuggesting}
          error={session.error}
          onRefresh={session.doRefresh}
          onClickSuggestion={session.clickSuggestion}
        />
        <ChatPanel
          messages={session.chat}
          isStreaming={session.isStreaming}
          onSend={session.sendChatMessage}
        />
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => {
            if (!settings.groqApiKey) return // force them to set a key first
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
