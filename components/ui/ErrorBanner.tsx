import type { ReactNode } from "react";
import styles from "./ErrorBanner.module.css";

type ErrorBannerProps = {
  message: string;
  action?: ReactNode;
};

export function ErrorBanner({ message, action }: ErrorBannerProps) {
  return (
    <div className={styles.root} role="alert">
      <span className={styles.message}>{message}</span>
      {action ? <span className={styles.actions}>{action}</span> : null}
    </div>
  );
}
