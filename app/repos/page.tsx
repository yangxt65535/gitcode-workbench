"use client";

import { ReposWorkbench } from "@/components/repos/ReposWorkbench";
import styles from "./page.module.css";

export default function ReposPage() {
  return (
    <div className={styles.page}>
      <ReposWorkbench />
    </div>
  );
}
