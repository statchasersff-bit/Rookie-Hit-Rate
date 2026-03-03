import { HeatmapTable } from "@/components/heatmap-table";
import { PickLensCard } from "@/components/pick-lens-card";

export default function Overview() {
  return (
    <div className="flex flex-col lg:flex-row gap-6" data-testid="page-overview">
      <div className="flex-1 min-w-0">
        <HeatmapTable />
      </div>
      <div className="w-full lg:w-72 shrink-0">
        <div className="lg:sticky lg:top-36">
          <PickLensCard />
        </div>
      </div>
    </div>
  );
}
