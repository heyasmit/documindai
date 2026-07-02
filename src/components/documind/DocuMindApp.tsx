import { useCallback, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { UploadZone } from "./UploadZone";
import { ChatWorkspace } from "./ChatWorkspace";
import type { ChatMessage, UploadedDoc } from "./types";
import { FileText } from "lucide-react";

const MAX_SIZE = 50 * 1024 * 1024;

export function DocuMindApp() {
  const [apiKey, setApiKey] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [messagesByDoc, setMessagesByDoc] = useState<Record<string, ChatMessage[]>>({});

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? null,
    [docs, activeDocId],
  );

  const handleFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter((f) => f.size <= MAX_SIZE);
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
    if (newDocs[0]) setActiveDocId(newDocs[0].id);
  }, []);

  const clearSession = useCallback(() => {
    setDocs([]);
    setActiveDocId(null);
    setMessagesByDoc({});
  }, []);

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setMessagesByDoc((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setActiveDocId((cur) => (cur === id ? null : cur));
  }, []);

  const setMessages = useCallback(
    (docId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesByDoc((prev) => ({ ...prev, [docId]: updater(prev[docId] ?? []) }));
    },
    [],
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        docs={docs}
        activeDocId={activeDocId}
        onSelect={setActiveDocId}
        onRemove={removeDoc}
        onClear={clearSession}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-6 gap-3 bg-surface/60 backdrop-blur">
          <FileText className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-medium truncate">
            {activeDoc ? activeDoc.name : "Upload a document to begin"}
          </h1>
          {activeDoc && (
            <span className="ml-auto text-xs text-muted-foreground">
              {(activeDoc.size / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </header>
        <div className="flex-1 min-h-0">
          {activeDoc ? (
            <ChatWorkspace
              key={activeDoc.id}
              doc={activeDoc}
              apiKey={apiKey}
              messages={messagesByDoc[activeDoc.id] ?? []}
              setMessages={(u) => setMessages(activeDoc.id, u)}
            />
          ) : (
            <UploadZone onFiles={handleFiles} maxSize={MAX_SIZE} />
          )}
        </div>
      </main>
    </div>
  );
}
