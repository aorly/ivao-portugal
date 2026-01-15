import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Airport details"
        subtitle="Preparing airport data and resources."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "airport", label: "Fetching airport details", weight: 4 },
          { id: "charts", label: "Loading charts and frequencies", weight: 3 },
          { id: "render", label: "Rendering airport page", weight: 2 },
        ]}
      />
    </main>
  );
}
