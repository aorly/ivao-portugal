import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Loading page"
        subtitle="Fetching public data and preparing the layout."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "content", label: "Fetching public content", weight: 4 },
          { id: "media", label: "Loading media and assets", weight: 2 },
          { id: "render", label: "Rendering page sections", weight: 3 },
        ]}
      />
    </main>
  );
}
