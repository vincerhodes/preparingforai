import Script from "next/script";
import { site } from "@/site.config";

/**
 * Official Buzzsprout small player embed for the show.
 * Renders the latest-episode player once the external script loads.
 */
export default function BuzzsproutPlayer() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div id="buzzsprout-small-player" />
      <Script
        src={`https://www.buzzsprout.com/${site.buzzsproutId}.js?container_id=buzzsprout-small-player&player=small`}
        strategy="lazyOnload"
        charSet="utf-8"
      />
    </div>
  );
}
