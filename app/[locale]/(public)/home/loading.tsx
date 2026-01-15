import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Home"
        subtitle="Preparing live data and highlights."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "stats", label: "Fetching stats and activity", weight: 4 },
          { id: "maps", label: "Loading map visuals", weight: 2 },
          { id: "render", label: "Rendering home sections", weight: 3 },
        ]}
      />
    </main>
  );
}
