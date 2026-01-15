import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Airports"
        subtitle="Preparing airport data and counts."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "airports", label: "Fetching airport list", weight: 4 },
          { id: "counts", label: "Counting stands, SIDs, and STARs", weight: 3 },
          { id: "filters", label: "Preparing filters and layout", weight: 2 },
        ]}
      />
    </main>
  );
}
