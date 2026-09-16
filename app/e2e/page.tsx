"use client";

import { E2eWorkbench } from "@/components/e2e/E2eWorkbench";
import styles from "./page.module.css";

export default function E2ePage() {
  return (
    <div className={styles.page}>
      <E2eWorkbench />
    </div>
  );
}
