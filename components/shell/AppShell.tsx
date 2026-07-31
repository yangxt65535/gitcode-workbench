"use client";

import type { ReactNode } from "react";
import { ModuleNav } from "./ModuleNav";
import { RepoInputs } from "./RepoInputs";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>GitCode 工作台</div>
        <div className={styles.center}>
          <RepoInputs />
        </div>
        <div className={styles.navWrap}>
          <ModuleNav />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
