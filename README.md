# TwinMind — Live Suggestions

A real-time meeting copilot that transcribes your mic, surfaces 3 contextual suggestions every 30 seconds, and lets you explore them in a chat panel — all powered by Groq.

## Live Demo

https://twinmind-peach.vercel.app

## Setup

### Prerequisites

- Node.js 18+ — download from [nodejs.org](https://nodejs.org)
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, paste your Groq API key in Settings, and start recording.

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard — it detects Vite automatically.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Fast dev cycle, clean types, trivial Vercel deploy |
| Styling | Tailwind CSS | Utility-first; no stylesheet overhead |
| Transcription | Groq Whisper Large V3 | Required by spec; best OSS ASR available |
| LLM | Groq `llama-3.3-70b-versatile` (configurable) | Fast, high quality; update model ID in Settings to `llama-3.3-70b-versatile` or whichever GPT-OSS 120B model is current on Groq |
| Audio | MediaRecorder API | Native browser, no deps; chunks every 1s, captured every 30s |
| State | React hooks only | No external state library needed for this scope |

---

## Prompt Strategy

The live suggestion prompt is the product. My approach:

**Type-aware suggestions.** The prompt explicitly defines 5 types (QUESTION, TALKING_POINT, ANSWER, FACT_CHECK, CLARIFICATION) and instructs the model to pick types based on the *current conversational moment*:
- If someone just asked a question → lead with ANSWER
- If a factual claim was made → include FACT_CHECK
- Always include at least one QUESTION to advance the dialogue

**Preview = standalone value.** The prompt explicitly requires the preview to be "immediately useful on its own." This forces the model to put the substance in the card, not tease it.

**Recency bias.** Suggestions are generated on the most recent `N` characters of transcript (default 3000 chars ≈ last few minutes). This prevents stale suggestions from dominating.

**JSON mode.** `response_format: { type: 'json_object' }` ensures the model never wraps its output in markdown fences, making parsing reliable.

**Separate contexts.** Suggestions use a smaller context window (3000 chars) for speed and recency. Detail/chat answers use a larger window (8000 chars) for depth.

---

## Architecture

```
src/
├── types.ts                     # Shared types (Suggestion, ChatMessage, etc.)
├── lib/
│   ├── groq.ts                  # Groq API: transcription, suggestions, chat streaming
│   ├── storage.ts               # localStorage persistence + default prompts/settings
│   └── export.ts                # JSON session export
├── hooks/
│   ├── useAudioRecorder.ts      # MediaRecorder wrapper: start/stop/captureChunk
│   └── useSession.ts            # All session state: transcript, batches, chat, timer
└── components/
    ├── TranscriptPanel.tsx      # Left column: mic button + scrolling transcript
    ├── SuggestionsPanel.tsx     # Middle column: batched suggestion cards
    ├── ChatPanel.tsx            # Right column: streaming chat + input
    └── SettingsModal.tsx        # API key + all editable prompts/settings
```

**Audio flow:** `MediaRecorder` collects 1s blobs continuously → every 30s `captureChunk()` drains the buffer → blob sent to Whisper → text appended → suggestions generated from latest transcript.

**No backend.** All Groq API calls are made directly from the browser. The API key is stored in `localStorage` and sent in the `Authorization` header. No server needed.

---

## Tradeoffs

- **No chunked streaming for suggestion cards.** Suggestions use a single completion call with `json_object` mode. Streaming JSON reliably mid-object is fragile; the latency (~1-2s on Groq) is acceptable.
- **30s refresh is time-based, not semantic.** A smarter system would detect topic shifts. Time-based is predictable and lets users develop a mental model.
- **No deduplication across batches.** Older batches stay visible for reference. Deduplication would require semantic similarity which adds latency and complexity.
- **Direct browser → Groq calls.** Simpler and faster than proxying through a server. The key is user-owned and stored locally, so there's no server-side secret to protect.
