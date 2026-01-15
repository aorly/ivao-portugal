import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12">
      <LoadingPanel
        title="Airport timetable"
        subtitle="Preparing the live timetable view."
        steps={[
          { id: "translations", label: "Loading translations", weight: 1 },
          { id: "airports", label: "Fetching airports list", weight: 4 },
          { id: "timetable", label: "Loading timetable data", weight: 3 },
          { id: "render", label: "Rendering timetable", weight: 2 },
        ]}
      />
    </main>
  );
}
