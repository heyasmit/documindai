export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type UploadedDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  preview: string; // truncated text content for mock context
};
