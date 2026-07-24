"use client";

import Giscus from "@giscus/react";
import { hasGiscus, site } from "@/site.config";
import PlaceholderNotice from "./PlaceholderNotice";

export default function GiscusEmbed() {
  if (!hasGiscus()) {
    return (
      <PlaceholderNotice title="Forum not configured yet">
        The community forum runs on GitHub Discussions via Giscus. Once the
        repository is public with Discussions enabled, fill in the{" "}
        <code className="rounded bg-background px-1 py-0.5">giscus</code>{" "}
        values in <code className="rounded bg-background px-1 py-0.5">site.config.ts</code>{" "}
        and the comment widget will appear here automatically.
      </PlaceholderNotice>
    );
  }

  return (
    <Giscus
      repo={site.giscus.repo as `${string}/${string}`}
      repoId={site.giscus.repoId}
      category={site.giscus.category}
      categoryId={site.giscus.categoryId}
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme="dark"
      lang="en"
      loading="lazy"
    />
  );
}
