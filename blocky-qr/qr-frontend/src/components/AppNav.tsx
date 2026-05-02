"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Přehled" },
  { href: "/datasets", label: "Datasety" },
  { href: "/pipelines", label: "Pipeline" },
  { href: "/runs", label: "Běhy" },
  { href: "/alerts", label: "Alerty" },
  { href: "/alert-rules", label: "Pravidla alertů" },
];

export function AppNav() {
  const currentPath = usePathname();

  return (
    <aside className="app-nav">
      <div className="app-nav-brand">
        <Link href="/">BlockyQR</Link>
      </div>
      <nav className="app-nav-links">
        {links.map(({ href, label }) => {
          const active =
            href === "/"
              ? currentPath === "/"
              : currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={active ? "app-nav-link active" : "app-nav-link"}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
