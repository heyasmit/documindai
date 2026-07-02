import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Sparkles, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { ChatMessage, UploadedDoc } from "./types";
import { askDocument } from "@/lib/chat.functions";

type Props = {
  doc: UploadedDoc;
  apiKey: string;
  messages: ChatMessage[];
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
};

const SUGGESTIONS = [
  "Summarize this document",
  "List key takeaways",
  "Find action items",
  "Explain like I'm 5",
];

export function ChatWorkspace({ doc, apiKey: _apiKey, messages, setMessages }: Props) {
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askDocument);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    const aiId = crypto.randomUUID();
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await ask({
        data: {
          docName: doc.name,
          docText: doc.preview ?? "",
          history,
          question: trimmed,
        },
      });
      const full = result.text ?? "";
      setMessages((prev) => [
        ...prev,
        { id: aiId, role: "assistant", content: "", streaming: true },
      ]);
      // Reveal in chunks for a streaming feel
      const chunkSize = Math.max(2, Math.floor(full.length / 120));
      for (let i = 0; i < full.length; i += chunkSize) {
        await new Promise((r) => setTimeout(r, 10));
        const upto = full.slice(0, i + chunkSize);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, content: upto } : m)),
        );
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: full, streaming: false } : m)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          role: "assistant",
          content: `⚠️ **Something went wrong.** ${msg}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {isEmpty ? (
            <div className="text-center py-16">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary shadow-glow items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Ask anything about your document</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                Powered by Lovable AI — answers are grounded in your document.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
              {isThinking && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2 text-muted-foreground text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="ml-2">Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-surface/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={isThinking}
                className="text-xs px-3 py-1.5 rounded-full border bg-surface hover:bg-accent hover:border-primary/40 hover:text-accent-foreground transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="relative flex items-end gap-2 rounded-2xl border bg-surface shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-ring transition p-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything about this document..."
              className="flex-1 resize-none bg-transparent outline-none px-3 py-2 text-sm max-h-40 min-h-[36px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="h-9 w-9 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow disabled:opacity-40 disabled:shadow-none transition hover:brightness-110"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            DocuMind may generate inaccuracies. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-primary text-primary-foreground px-4 py-2.5 text-sm shadow-soft">
          {msg.content}
        </div>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface border px-4 py-3 shadow-soft">
        <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground text-sm text-foreground/90 leading-relaxed">
          <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 bg-primary align-middle ml-0.5 animate-blink" />
          )}
        </div>
      </div>
    </div>
  );
}
