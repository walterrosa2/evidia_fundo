import { createFileRoute } from "@tanstack/react-router";
import { PipelineHero } from "@/components/pipeline/PipelineHero";
import { PipelineOverview } from "@/components/pipeline/PipelineOverview";

export const Route = createFileRoute("/pipeline")({ component: Pipeline });

function Pipeline() {
  return (
    <div className="min-h-screen bg-background">
      <PipelineHero />
      <PipelineOverview />
    </div>
  );
}
