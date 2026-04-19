import type { SuggestionBatch, Suggestion, SuggestionType } from '../types'

interface Props {
  batches: SuggestionBatch[]
  isSuggesting: boolean
  error: string | null
  onRefresh: () => void
  onClickSuggestion: (s: Suggestion) => void
}

const TYPE_STYLES: Record<SuggestionType, { badge: string; border: string }> = {
  QUESTION:      { badge: 'bg-blue-100 text-blue-700',   border: 'border-l-blue-400' },
  TALKING_POINT: { badge: 'bg-green-100 text-green-700', border: 'border-l-green-400' },
  ANSWER:        { badge: 'bg-purple-100 text-purple-700', border: 'border-l-purple-400' },
  FACT_CHECK:    { badge: 'bg-orange-100 text-orange-700', border: 'border-l-orange-400' },
  CLARIFICATION: { badge: 'bg-cyan-100 text-cyan-700',   border: 'border-l-cyan-400' },
}

const TYPE_LABELS: Record<SuggestionType, string> = {
  QUESTION:      'Question',
  TALKING_POINT: 'Talking Point',
  ANSWER:        'Answer',
  FACT_CHECK:    'Fact Check',
  CLARIFICATION: 'Clarification',
}

export function SuggestionsPanel({ batches, isSuggesting, error, onRefresh, onClickSuggestion }: Props) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Live Suggestions</h2>
        <button
          onClick={onRefresh}
          disabled={isSuggesting}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors font-medium"
        >
          <RefreshIcon spinning={isSuggesting} />
          {isSuggesting ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Batches */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs font-semibold text-red-600 mb-0.5">Error</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        {batches.length === 0 && !isSuggesting && !error && (
          <p className="text-gray-400 text-center mt-8 text-sm">
            Start recording — suggestions appear every ~30 s
          </p>
        )}

        {isSuggesting && batches.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {batches.map((batch, batchIdx) => (
          <div key={batch.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-400">
                {new Date(batch.timestamp).toLocaleTimeString()}
              </span>
              {batchIdx === 0 && (
                <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium">
                  Latest
                </span>
              )}
            </div>
            <div className="space-y-2">
              {batch.suggestions.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} onClick={() => onClickSuggestion(s)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion, onClick }: { suggestion: Suggestion; onClick: () => void }) {
  const styles = TYPE_STYLES[suggestion.type]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border border-gray-100 border-l-4 ${styles.border} bg-gray-50 hover:bg-white hover:shadow-sm px-3 py-2.5 transition-all group`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${styles.badge}`}>
          {TYPE_LABELS[suggestion.type]}
        </span>
        <span className="ml-auto text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Click for details →
        </span>
      </div>
      <p className="text-xs text-gray-700 leading-snug">{suggestion.preview}</p>
    </button>
  )
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}
