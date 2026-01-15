import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Event details"
        subtitle="Preparing event information."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "event", label: "Fetching event details", weight: 4 },
          { id: "layout", label: "Loading event layout", weight: 3 },
          { id: "render", label: "Rendering event page", weight: 2 },
        ]}
      />
    </main>
  );
}
