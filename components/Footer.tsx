import { getListenLinks, site } from "@/site.config";

export default function Footer() {
  const listenLinks = getListenLinks();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 text-sm text-muted">
        {listenLinks.length > 0 && (
          <nav aria-label="Listen links">
            <ul className="flex flex-wrap items-center gap-4">
              {listenLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-accent"
                  >
                    Listen on {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <p>
          &copy; {year} {site.name}. Hosted by{" "}
          {site.hosts.map((host) => host.name).join(" & ")}.
        </p>
      </div>
    </footer>
  );
}
