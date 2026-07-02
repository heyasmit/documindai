import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type ChatInput = {
  docName: string;
  docText: string;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
};

const SYSTEM = `You are DocuMind, a precise document analysis assistant.
Answer ONLY using the provided document content. If the answer isn't in the document, say so clearly.
Use Markdown: headings, bold, bullet lists, and tables when helpful. Cite exact phrases when relevant.
Be concise but thorough. For exam-prep questions (repeated questions, key topics, important notes), quantify (e.g. "appeared in 4/5 years") and prioritize.`;

// Rough char limit to stay well inside model context: ~120k chars
const MAX_DOC_CHARS = 120_000;

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || typeof input.question !== "string" || !input.question.trim()) {
      throw new Error("Question is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const docText = (data.docText ?? "").slice(0, MAX_DOC_CHARS);
    const truncated = (data.docText ?? "").length > MAX_DOC_CHARS;

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const contextBlock = docText.trim()
      ? `<document name="${data.docName}"${truncated ? ' truncated="true"' : ""}>
${docText}
</document>`
      : `<document name="${data.docName}">
(No extractable text — the file may be a scanned image PDF. Tell the user you cannot read it.)
</document>`;

    try {
      const { text } = await generateText({
        model,
        system: SYSTEM,
        messages: [
          { role: "user", content: contextBlock },
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
