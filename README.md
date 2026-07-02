# DocuMind

DocuMind is a document-aware chat assistant for students and researchers. Upload multiple PDFs, DOCX, or text files (e.g. a syllabus plus previous-year question papers), then ask cross-document questions — most-repeated questions, key topics, important notes, summaries, etc. Answers cite the source file inline.

Built with [TanStack Start](https://tanstack.com/start) + React 19 + Tailwind v4, powered by the Lovable AI Gateway (Gemini).
direct link. https://documindai.lovable.app/
## Features

- 📚 **Multi-document sessions** — upload a syllabus and several PYQ papers at once and query them as a single corpus
- 🧠 **Grounded answers** — responses come only from your uploaded content, with inline `[source: filename.pdf]` citations
- 📝 **Markdown output** — headings, tables, bullet lists, quoted excerpts
- 🎯 **Exam-prep mode** — aggregates repeated questions across years, quantifies frequencies, highlights important notes
- 🌓 **Light / dark mode** with system-preference detection
- 🔒 **Same-origin guard, input caps, and sanitised errors** on the AI endpoint to protect API credits

## Tech Stack

- **Framework:** TanStack Start v1 (SSR, server functions) on Vite 7
- **UI:** React 19, Tailwind CSS v4, shadcn/ui, Radix primitives, lucide-react icons
- **AI:** Vercel AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`)
- **Parsing:** `pdfjs-dist` for PDFs, `mammoth` for DOCX, native `File.text()` for plain text
- **Language:** TypeScript (strict)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or npm/pnpm — commands below use Bun)
- A `LOVABLE_API_KEY` from your Lovable workspace (server-side only)

### Install & run

```bash
bun install
bun run dev
```

The dev server starts on `http://localhost:8080`.

### Environment variables

Create a `.env` file (not committed) with:

```
LOVABLE_API_KEY=your_key_here
```

This key is read only inside server function handlers and is never exposed to the browser.

### Build

```bash
bun run build         # production build
bun run build:dev     # development-mode build
bun run preview       # preview the built app
```

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx              # HTML shell, head metadata, providers
│   └── index.tsx               # Home route (DocuMind app)
├── components/
│   ├── documind/               # Feature components
│   │   ├── DocuMindApp.tsx     # Top-level layout + session state
│   │   ├── Sidebar.tsx         # Doc list, theme toggle
│   │   ├── UploadZone.tsx      # Multi-file dropzone
│   │   ├── ChatWorkspace.tsx   # Chat UI + streaming render
│   │   └── ThemeToggle.tsx     # Light/dark mode switch
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── chat.functions.ts       # createServerFn: askDocument (RPC)
│   ├── ai-gateway.server.ts    # Lovable AI Gateway provider factory
│   └── extract-text.ts         # PDF / DOCX / text extraction
├── styles.css                  # Tailwind v4 + design tokens
└── router.tsx                  # Router bootstrap
```

## How It Works

1. **Extraction (client)** — `extract-text.ts` parses each uploaded file into plain text using `pdfjs-dist` or `mammoth`.
2. **RPC call** — `ChatWorkspace` calls the `askDocument` server function via `useServerFn`, sending the doc corpus, chat history, and the new question.
3. **Prompting (server)** — `chat.functions.ts` composes an XML-tagged document block per file, budgets characters evenly across docs (200k total), and sends system + user messages to Gemini through the Lovable AI Gateway.
4. **Response** — the answer is streamed into the UI with Markdown + GFM rendering.

## Security Notes

The `askDocument` endpoint applies several safeguards:

- **Same-origin check** — rejects requests whose `Origin`/`Referer` host doesn't match the server host.
- **Input caps** — question ≤ 4,000 chars, history ≤ 50 messages × 8,000 chars, docs ≤ 20 entries.
- **Sanitised errors** — full errors are logged server-side; clients receive generic messages.

The app currently has no per-user authentication. If you fork it for a public deployment, add auth (Lovable Cloud / Supabase) and per-user quotas before exposing it broadly.

## Deployment

This project targets edge runtimes (e.g. Cloudflare Workers) via TanStack Start. If you built it in Lovable, publish from the editor. Otherwise deploy the standard TanStack Start build output to your preferred edge host and set `LOVABLE_API_KEY` in that environment.

## License

MIT — do whatever you want, no warranty.
