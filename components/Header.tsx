import Link from "next/link";
import NavLink from "@/components/NavLink";
import { site } from "@/site.config";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Episodes", href: "/episodes" },
  { label: "Articles", href: "/articles" },
  { label: "Forum", href: "/forum" },
  { label: "About", href: "/about" },
];

export default function Header() {
  return (
    <header className="border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground hover:text-accent"
        >
          {site.name}
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-5 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
