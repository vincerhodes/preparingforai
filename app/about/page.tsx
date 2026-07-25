import type { Metadata } from "next";
import { getListenLinks, site } from "@/site.config";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} and its hosts.`,
};

export default function AboutPage() {
  const listenLinks = getListenLinks();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        About {site.name}
      </h1>
      <p className="mt-2 text-accent">{site.tagline}</p>
      <p className="mt-4 leading-relaxed text-muted">{site.description}</p>

      <section aria-labelledby="hosts" className="mt-10">
        <h2 id="hosts" className="text-2xl font-bold text-foreground">
          Your hosts
        </h2>
        <ul className="mt-4 flex flex-col gap-4">
          {site.hosts.map((host) => (
            <li
              key={host.name}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <p className="text-lg font-semibold text-foreground">
                {host.name}
              </p>
              <p className="mt-1 text-sm text-muted">
                Co-host of {site.name}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {listenLinks.length > 0 && (
        <section aria-labelledby="listen" className="mt-10">
          <h2 id="listen" className="text-2xl font-bold text-foreground">
            Listen
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {listenLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  Listen on {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
