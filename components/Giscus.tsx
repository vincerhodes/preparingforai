"use client";

import Giscus from "@giscus/react";
import { hasGiscus, site } from "@/site.config";
import PlaceholderNotice from "./PlaceholderNotice";

export default function GiscusEmbed() {
  if (!hasGiscus()) {
    return (
      <PlaceholderNotice title="Comments coming soon">
        The community forum isn&apos;t open just yet. Check back soon to join
        the conversation.
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
