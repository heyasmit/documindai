import { useCallback, useState } from "react";
import { Sidebar } from "./Sidebar";
import { UploadZone } from "./UploadZone";
import { ChatWorkspace } from "./ChatWorkspace";
import type { ChatMessage, UploadedDoc } from "./types";
import { FileText, Plus } from "lucide-react";

const MAX_SIZE = 50 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.txt";

export function DocuMindApp() {
  const [apiKey, setApiKey] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ingesting, setIngesting] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter((f) => f.size <= MAX_SIZE);
    if (accepted.length === 0) return;
    setIngesting(true);
    try {
      const { extractText } = await import("@/lib/extract-text");
      const newDocs: UploadedDoc[] = [];
      for (const file of accepted) {
        let preview = "";
        try {
          preview = await extractText(file);
        } catch (err) {
          console.error("extraction failed", err);
        }
        newDocs.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          uploadedAt: Date.now(),
          preview,
        });
      }
      setDocs((prev) => [...prev, ...newDocs]);
    } finally {
      setIngesting(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setDocs([]);
    setMessages([]);
  }, []);

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const onAddClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPT;
    input.onchange = () => {
      if (input.files) handleFiles(Array.from(input.files));
    };
    input.click();
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        docs={docs}
        onRemove={removeDoc}
        onClear={clearSession}
        onAdd={onAddClick}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-6 gap-3 bg-surface/60 backdrop-blur">
          <FileText className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-medium truncate">
            {docs.length === 0
              ? "Upload documents to begin"
              : `${docs.length} document${docs.length === 1 ? "" : "s"} in session`}
          </h1>
          {docs.length > 0 && (
            <button
              onClick={onAddClick}
              className="ml-auto inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-surface hover:bg-accent hover:border-primary/40 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add files
            </button>
          )}
        </header>
        <div className="flex-1 min-h-0">
          {docs.length > 0 ? (
            <ChatWorkspace
              docs={docs}
              apiKey={apiKey}
              messages={messages}
              setMessages={setMessages}
              ingesting={ingesting}
            />
          ) : (
            <UploadZone onFiles={handleFiles} maxSize={MAX_SIZE} multiple />
          )}
        </div>
      </main>
    </div>
  );
}
