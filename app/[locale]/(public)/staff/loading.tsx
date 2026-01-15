import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Staff"
        subtitle="Preparing staff roster."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "staff", label: "Fetching staff list", weight: 4 },
          { id: "roles", label: "Preparing departments", weight: 2 },
          { id: "render", label: "Rendering staff cards", weight: 3 },
        ]}
      />
    </main>
  );
}
