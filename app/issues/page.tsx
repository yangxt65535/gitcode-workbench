"use client";

import { IssuesWorkbench } from "@/components/issues/IssuesWorkbench";
import styles from "./page.module.css";

export default function IssuesPage() {
  return (
    <div className={styles.page}>
      <IssuesWorkbench />
    </div>
  );
}
