import { Brain, FileText, Info, Trash2, X } from "lucide-react";
import type { UploadedDoc } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

type Props = {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  docs: UploadedDoc[];
  activeDocId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function Sidebar({
  apiKey,
  onApiKeyChange,
  docs,
  activeDocId,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  return (
    <aside className="w-72 shrink-0 border-r flex flex-col bg-surface-elevated">
      {/* Brand */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary shadow-glow flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">DocuMind AI</h2>
            <p className="text-[11px] text-muted-foreground">Chat with any document</p>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="p-5 border-b space-y-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="api-key" className="text-xs font-medium text-foreground">
            Gemini API Key
          </label>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed">
                Get a free key from Google AI Studio (aistudio.google.com/apikey). Stored only in
                your browser session.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <input
          id="api-key"
          type="password"
          placeholder="AIza..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="w-full h-9 px-3 rounded-md border bg-surface text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          {apiKey ? "✓ Key set — live mode" : "Demo mode active (no key required)"}
        </p>
      </div>

      {/* Docs */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Session Documents
          </span>
          <span className="text-[11px] text-muted-foreground">{docs.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
          {docs.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-4 text-center">
              No documents yet
            </div>
          ) : (
            <ul className="space-y-1">
              {docs.map((d) => (
                <li key={d.id}>
                  <div
                    className={`group flex items-center gap-2 px-2.5 py-2 rounded-md text-sm cursor-pointer transition ${
                      activeDocId === d.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => onSelect(d.id)}
                  >
                    <FileText className="h-4 w-4 shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-medium">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {(d.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(d.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Clear */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={docs.length === 0}
          className="w-full gap-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Session
        </Button>
      </div>
    </aside>
  );
}
