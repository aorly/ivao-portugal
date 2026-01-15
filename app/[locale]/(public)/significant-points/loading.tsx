import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Significant points"
        subtitle="Preparing navigation points."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "points", label: "Fetching points list", weight: 4 },
          { id: "filters", label: "Preparing filters", weight: 2 },
          { id: "render", label: "Rendering points list", weight: 3 },
        ]}
      />
    </main>
  );
}
