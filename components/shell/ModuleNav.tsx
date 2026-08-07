"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ModuleNav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/issues", label: "Issues" },
  { href: "/pulls", label: "Pulls" },
  { href: "/repos", label: "Repos" },
] as const;

export function ModuleNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="模块导航">
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${active ? styles.active : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
