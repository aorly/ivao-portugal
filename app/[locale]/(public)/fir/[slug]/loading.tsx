import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="FIR details"
        subtitle="Preparing FIR information."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "fir", label: "Fetching FIR data", weight: 4 },
          { id: "airports", label: "Loading FIR airports", weight: 3 },
          { id: "render", label: "Rendering FIR page", weight: 2 },
        ]}
      />
    </main>
  );
}
