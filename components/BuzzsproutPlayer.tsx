import Script from "next/script";
import { site } from "@/site.config";

/**
 * Official Buzzsprout large smart player embed for the show.
 * Renders the episode player once the external script loads.
 */
export default function BuzzsproutPlayer() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div id="buzzsprout-large-player" />
      <Script
        src={`https://www.buzzsprout.com/${site.buzzsproutId}.js?container_id=buzzsprout-large-player&player=large`}
        strategy="lazyOnload"
        charSet="utf-8"
      />
    </div>
  );
}
