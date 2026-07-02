import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Sparkles, User } from "lucide-react";
import type { ChatMessage, UploadedDoc } from "./types";

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

function mockAnswer(prompt: string, doc: UploadedDoc): string {
  const p = prompt.toLowerCase();
  if (p.includes("summar")) {
    return `Here's a concise summary of **${doc.name}**:\n\n- The document introduces its core topic and frames the problem it addresses.\n- It walks through supporting evidence, examples, and methodology.\n- The conclusion synthesizes the main arguments and proposes next steps.\n\n*Note: This is a demo response. Add your Gemini API key for grounded answers.*`;
  }
  if (p.includes("takeaway") || p.includes("key")) {
    return `**Key takeaways from ${doc.name}:**\n\n1. **Primary thesis** — the central claim the document is built around.\n2. **Supporting evidence** — data, references, and case studies cited.\n3. **Implications** — what this means in practice.\n4. **Open questions** — areas the document leaves unresolved.`;
  }
  if (p.includes("action")) {
    return `**Action items identified:**\n\n- [ ] Review the referenced sources for context\n- [ ] Follow up on the recommendations in section 3\n- [ ] Share findings with your team\n- [ ] Schedule a decision point within two weeks`;
  }
  return `Great question about **${doc.name}**. Based on the content, here's what I can tell you:\n\nThe document addresses your query by walking through several supporting points. If you'd like, I can dig deeper into a specific section or extract a particular detail.\n\n> Tip: add your Gemini API key in the sidebar to enable real, document-grounded answers.`;
}

export function ChatWorkspace({ doc, apiKey, messages, setMessages }: Props) {
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // Simulated streaming response
    const full = mockAnswer(trimmed, doc);
    const aiId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: aiId, role: "assistant", content: "", streaming: true }]);

    // small "thinking" delay
    await new Promise((r) => setTimeout(r, 450));

    const tokens = full.split(/(\s+)/);
    for (let i = 0; i < tokens.length; i++) {
      await new Promise((r) => setTimeout(r, 18));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: m.content + tokens[i] } : m,
        ),
      );
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m)),
    );
    setIsThinking(false);
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
                {apiKey ? "Live mode ready." : "Demo mode — add a Gemini key for real answers."}
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
