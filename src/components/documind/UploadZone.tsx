import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, FileType2, FileCode2 } from "lucide-react";

type Props = {
  onFiles: (files: File[]) => void;
  maxSize: number;
  multiple?: boolean;
};

export function UploadZone({ onFiles, maxSize, multiple = true }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    maxSize,
    multiple,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
  });

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-gradient-subtle">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">Start with a document</h2>
          <p className="mt-2 text-muted-foreground">
            Upload a file to chat, summarize, and extract insights instantly.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-12 text-center bg-surface shadow-soft ${
            isDragActive
              ? "border-primary bg-accent scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-surface-elevated"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">
                {isDragActive ? "Drop them here" : "Drag & drop your files"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="text-primary font-medium">browse from your computer</span> — upload multiple at once
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> PDF
              </span>
              <span className="flex items-center gap-1.5">
                <FileType2 className="h-3.5 w-3.5" /> DOCX
              </span>
              <span className="flex items-center gap-1.5">
                <FileCode2 className="h-3.5 w-3.5" /> TXT
              </span>
              <span className="text-border">•</span>
              <span>Up to {maxSize / 1024 / 1024}MB</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { title: "Summarize", desc: "Get the gist in seconds" },
            { title: "Ask Anything", desc: "Q&A grounded in your doc" },
            { title: "Extract", desc: "Pull key facts & actions" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-surface p-4">
              <div className="text-sm font-medium">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
