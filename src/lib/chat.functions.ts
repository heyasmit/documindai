import { createServerFn } from "@tanstack/react-start";
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

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || typeof input.question !== "string" || !input.question.trim()) {
      throw new Error("Question is required");
    }
    if (!Array.isArray(input.docs) || input.docs.length === 0) {
      throw new Error("At least one document is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

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
      throw err;
    }
  });
