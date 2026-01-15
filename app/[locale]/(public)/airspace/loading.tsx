import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Airspace"
        subtitle="Preparing airspace data and visuals."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "sectors", label: "Fetching sectors and layers", weight: 4 },
          { id: "maps", label: "Loading map visuals", weight: 3 },
          { id: "render", label: "Rendering airspace view", weight: 2 },
        ]}
      />
    </main>
  );
}
