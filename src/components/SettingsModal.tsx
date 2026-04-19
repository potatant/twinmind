import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../lib/storage'

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>({ ...settings })

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    if (!draft.groqApiKey.trim()) {
      alert('A Groq API key is required.')
      return
    }
    onSave(draft)
  }

  const handleReset = () => {
    setDraft({
      ...DEFAULT_SETTINGS,
      groqApiKey: draft.groqApiKey, // preserve the key
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* API Key */}
          <Section title="Groq API Key" required>
            <input
              type="password"
              value={draft.groqApiKey}
              onChange={(e) => set('groqApiKey', e.target.value)}
              placeholder="gsk_..."
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">
              Get a free key at <span className="font-mono">console.groq.com</span>. Stored locally, never sent anywhere except Groq.
            </p>
          </Section>

          {/* Models */}
          <Section title="Models">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>LLM model</label>
                <input
                  type="text"
                  value={draft.model}
                  onChange={(e) => set('model', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Whisper model</label>
                <input
                  type="text"
                  value={draft.whisperModel}
                  onChange={(e) => set('whisperModel', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          {/* Timing */}
          <Section title="Timing">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Refresh interval (s)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={draft.refreshIntervalSeconds}
                  onChange={(e) => set('refreshIntervalSeconds', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Suggestion context (chars)</label>
                <input
                  type="number"
                  min={500}
                  max={20000}
                  step={500}
                  value={draft.suggestionContextChars}
                  onChange={(e) => set('suggestionContextChars', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Detail/chat context (chars)</label>
                <input
                  type="number"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={draft.detailContextChars}
                  onChange={(e) => set('detailContextChars', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          {/* Prompts */}
          <Section title="Live Suggestion Prompt">
            <textarea
              rows={8}
              value={draft.suggestionPrompt}
              onChange={(e) => set('suggestionPrompt', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y`}
            />
          </Section>

          <Section title="Detail Answer Prompt (on suggestion click)">
            <textarea
              rows={5}
              value={draft.detailPrompt}
              onChange={(e) => set('detailPrompt', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y`}
            />
          </Section>

          <Section title="Chat System Prompt">
            <textarea
              rows={5}
              value={draft.chatSystemPrompt}
              onChange={(e) => set('chatSystemPrompt', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y`}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children, required }: { title: string; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}{required && <span className="text-red-400 ml-1">*</span>}
      </h3>
      {children}
    </div>
  )
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition'

const labelClass = 'block text-xs text-gray-500 mb-1'

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
