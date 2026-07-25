import Link from "next/link";
import { site } from "@/site.config";

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-3 text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        Back to {site.name}
      </Link>
    </div>
  );
}
