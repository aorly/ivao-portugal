import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Content"
        subtitle="Preparing page content."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "content", label: "Fetching page content", weight: 4 },
          { id: "assets", label: "Loading assets", weight: 2 },
          { id: "render", label: "Rendering content blocks", weight: 3 },
        ]}
      />
    </main>
  );
}
