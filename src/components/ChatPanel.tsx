import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
  onSend: (text: string) => void
}

export function ChatPanel({ messages, isStreaming, onSend }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    onSend(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-8 text-sm">
            Click a suggestion or type a question
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-1 items-center pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent leading-snug"
            rows={2}
            placeholder="Ask anything about the conversation…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-lg p-2.5 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        <SimpleMarkdown content={message.content} isUser={isUser} />
        <p className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

function SimpleMarkdown({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return <span className="opacity-50">…</span>

  // Normalise <br> and <br /> into real newlines, then split
  const normalised = content.replace(/<br\s*\/?>/gi, '\n')
  // Split markdown table lines into plain text rows (strip leading/trailing pipes)
  const lines = normalised.split('\n')

  // Detect if a line is a markdown table separator like |---|---|
  const isTableSep = (l: string) => /^\|[\s\-|:]+\|$/.test(l.trim())
  // Detect table row
  const isTableRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|')

  // Group consecutive table lines into one table block
  const blocks: Array<{ type: 'table'; rows: string[][] } | { type: 'line'; text: string }> = []
  let i = 0
  while (i < lines.length) {
    if (isTableRow(lines[i]) && !isTableSep(lines[i])) {
      const tableRows: string[][] = []
      while (i < lines.length && (isTableRow(lines[i]) || isTableSep(lines[i]))) {
        if (!isTableSep(lines[i])) {
          const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim())
          tableRows.push(cells)
        }
        i++
      }
      blocks.push({ type: 'table', rows: tableRows })
    } else {
      blocks.push({ type: 'line', text: lines[i] })
      i++
    }
  }

  return (
    <div className="space-y-0.5">
      {blocks.map((block, bi) => {
        if (block.type === 'table') {
          const [head, ...body] = block.rows
          return (
            <div key={bi} className="overflow-x-auto my-1">
              <table className="text-xs border-collapse w-full">
                {head && (
                  <thead>
                    <tr>
                      {head.map((cell, ci) => (
                        <th key={ci} className={`border border-current/20 px-2 py-1 text-left font-semibold ${isUser ? 'border-white/20' : 'border-gray-300'}`}>
                          {renderInline(cell, isUser)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={`border border-current/20 px-2 py-1 ${isUser ? 'border-white/20' : 'border-gray-300'}`}>
                          {renderInline(cell, isUser)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        const line = block.text
        if (line.startsWith('### '))
          return <p key={bi} className="font-bold mt-1">{renderInline(line.slice(4), isUser)}</p>
        if (line.startsWith('## '))
          return <p key={bi} className="font-bold mt-1">{renderInline(line.slice(3), isUser)}</p>
        if (line.startsWith('# '))
          return <p key={bi} className="font-bold mt-1">{renderInline(line.slice(2), isUser)}</p>
        if (line.startsWith('- ') || line.startsWith('• '))
          return (
            <div key={bi} className="flex gap-1.5">
              <span className="mt-[3px] shrink-0">•</span>
              <span>{renderInline(line.slice(2), isUser)}</span>
            </div>
          )
        if (line.trim() === '') return <div key={bi} className="h-1" />
        return <p key={bi}>{renderInline(line, isUser)}</p>
      })}
    </div>
  )
}

function renderInline(text: string, isUser: boolean) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className={`text-xs px-1 rounded font-mono ${isUser ? 'bg-blue-500' : 'bg-gray-200'}`}>
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
