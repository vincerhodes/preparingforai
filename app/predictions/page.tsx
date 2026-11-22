import type { Metadata } from "next";
import PredictionsBoard from "@/components/PredictionsBoard";
import { getBenchmarkPredictions, getPredictions } from "@/lib/catalog";
import { hydratePredictionsWithPolymarket } from "@/lib/polymarket";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Predictions",
  description:
    "Every dated and open-ended prediction from the show, extracted from transcripts and verified against the web once the target date passes — benchmarked against Ed Zitron and Sam Altman, with live Polymarket odds on the open ones.",
};

export default async function PredictionsPage() {
  const [hydratedPredictions, hydratedBenchmarks] = await Promise.all([
    hydratePredictionsWithPolymarket(getPredictions()),
    hydratePredictionsWithPolymarket(getBenchmarkPredictions()),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Predictions Tracker
      </h1>
      <p className="mt-2 text-muted">
        Every claim Jimmy, Matt and guests make on air is extracted from the
        episode transcripts, dated where possible, and logged here. Once a
        target date passes we verify the outcome on the web and score it —
        hits, misses and partials. Jimmy &amp; Matt&apos;s on-air scorecard sits
        beside Bull &amp; Bear benchmarks (<strong>Ed Zitron</strong> and{" "}
        <strong>Sam Altman</strong>) for comparison, and open bets are linked to
        live Polymarket markets so you can watch the odds move.
      </p>

      <div className="mt-8">
        <PredictionsBoard
          predictions={hydratedPredictions}
          benchmarks={hydratedBenchmarks}
        />
      </div>
    </div>
  );
}
