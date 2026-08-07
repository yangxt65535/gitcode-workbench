"use client";

import { DashboardWorkbench } from "@/components/dashboard/DashboardWorkbench";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <DashboardWorkbench />
    </div>
  );
}
