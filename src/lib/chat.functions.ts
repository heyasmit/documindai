import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type DocInput = { name: string; text: string };

type ChatInput = {
  docs: DocInput[];
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
};

const SYSTEM = `You are DocuMind, a precise multi-document analysis assistant.
The user may upload multiple documents in one session (e.g. a syllabus plus several previous-year question papers). Treat them as a single corpus and cross-reference them when answering.
Answer ONLY using the provided documents. When a fact comes from a specific file, cite it inline like [source: filename.pdf]. If the answer isn't in any document, say so clearly.
Use Markdown: headings, bold, bullet lists, and tables when helpful. Quote exact phrases when relevant.
For exam-prep questions (repeated questions, key topics, important notes), aggregate across all papers, quantify frequencies (e.g. "appeared in 4/5 years"), and prioritize.`;

// Total budget across all docs; per-doc share is computed evenly.
const MAX_TOTAL_CHARS = 200_000;
const MAX_QUESTION_CHARS = 4_000;
const MAX_HISTORY_MESSAGES = 50;
const MAX_HISTORY_CONTENT_CHARS = 8_000;
const MAX_DOCS = 20;
const MAX_DOC_NAME_CHARS = 512;

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || typeof input.question !== "string" || !input.question.trim()) {
      throw new Error("Question is required");
    }
    if (input.question.length > MAX_QUESTION_CHARS) {
      throw new Error(`Question exceeds maximum length of ${MAX_QUESTION_CHARS} characters`);
    }
    if (!Array.isArray(input.docs) || input.docs.length === 0) {
      throw new Error("At least one document is required");
    }
    if (input.docs.length > MAX_DOCS) {
      throw new Error(`Too many documents (max ${MAX_DOCS})`);
    }
    for (const d of input.docs) {
      if (!d || typeof d.name !== "string" || typeof d.text !== "string") {
        throw new Error("Invalid document entry");
      }
      if (d.name.length > MAX_DOC_NAME_CHARS) {
        throw new Error("Document name too long");
      }
    }
    if (!Array.isArray(input.history)) {
      throw new Error("Invalid history");
    }
    if (input.history.length > MAX_HISTORY_MESSAGES) {
      throw new Error(`History exceeds maximum of ${MAX_HISTORY_MESSAGES} messages`);
    }
    for (const m of input.history) {
      if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
        throw new Error("Invalid history entry");
      }
      if (m.content.length > MAX_HISTORY_CONTENT_CHARS) {
        throw new Error(`History message exceeds maximum length of ${MAX_HISTORY_CONTENT_CHARS} characters`);
      }
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Basic anti-abuse: require the request to come from our own origin.
    // This app has no user auth; same-origin enforcement blocks the endpoint
    // from being trivially called by third parties draining AI credits.
    try {
      const req = getRequest();
      const host = req.headers.get("host") ?? "";
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const source = origin ?? referer ?? "";
      if (!source || !host) {
        throw new Error("Forbidden");
      }
      let sourceHost = "";
      try {
        sourceHost = new URL(source).host;
      } catch {
        throw new Error("Forbidden");
      }
      if (sourceHost !== host) {
        throw new Error("Forbidden");
      }
    } catch (err) {
      console.error("[askDocument] origin check failed", err);
      throw new Error("Forbidden");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      console.error("[askDocument] LOVABLE_API_KEY is not configured");
      throw new Error("AI request failed");
    }

    const perDoc = Math.floor(MAX_TOTAL_CHARS / data.docs.length);
    const blocks = data.docs
      .map((d) => {
        const raw = (d.text ?? "").trim();
        if (!raw) {
          return `<document name="${d.name}">
(No extractable text — the file may be a scanned image PDF.)
</document>`;
        }
        const clipped = raw.slice(0, perDoc);
        const truncated = raw.length > perDoc;
        return `<document name="${d.name}"${truncated ? ' truncated="true"' : ""}>
${clipped}
</document>`;
      })
      .join("\n\n");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const { text } = await generateText({
        model,
        system: SYSTEM,
        messages: [
          { role: "user", content: `Here are ${data.docs.length} document(s) for this session:\n\n${blocks}` },
          ...data.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: data.question },
        ],
      });
      return { text };
    } catch (err) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 429) {
        return { text: "**Rate limit reached.** Please wait a moment and try again." };
      }
      if (e?.statusCode === 402) {
        return {
          text: "**AI credits exhausted.** Add credits in workspace billing to continue.",
        };
      }
      // Log full detail server-side; return a sanitised message to the client.
      console.error("[askDocument] AI request failed", err);
      throw new Error("AI request failed");
    }
  });
