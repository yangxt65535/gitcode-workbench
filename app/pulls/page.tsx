"use client";

import { PullsWorkbench } from "@/components/pulls/PullsWorkbench";
import styles from "./page.module.css";

export default function PullsPage() {
  return (
    <div className={styles.page}>
      <PullsWorkbench />
    </div>
  );
}
