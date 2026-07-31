"use client";

import type { ReactNode } from "react";
import { TokenStatus } from "@/components/auth/TokenStatus";
import { ModuleNav } from "./ModuleNav";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>GitCode 工作台</div>
        <div className={styles.navWrap}>
          <ModuleNav />
        </div>
        <div className={styles.authWrap}>
          <TokenStatus />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
