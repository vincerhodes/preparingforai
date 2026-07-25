"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-10 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 text-muted">
        An unexpected error occurred while loading this page.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="mt-6 rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}
