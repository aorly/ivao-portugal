import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Events"
        subtitle="Preparing the events schedule."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "events", label: "Fetching events list", weight: 4 },
          { id: "filters", label: "Preparing filters", weight: 2 },
          { id: "render", label: "Rendering event cards", weight: 3 },
        ]}
      />
    </main>
  );
}
