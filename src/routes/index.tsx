import { createFileRoute } from "@tanstack/react-router";
import { DocuMindApp } from "@/components/documind/DocuMindApp";

export const Route = createFileRoute("/")({
  component: DocuMindApp,
});
