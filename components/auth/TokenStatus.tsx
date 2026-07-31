"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { TokenModal } from "./TokenModal";
import styles from "./TokenStatus.module.css";

export function TokenStatus() {
  const { username, ready } = useAuth();
  const [open, setOpen] = useState(false);

  if (!ready) {
    return <div className={styles.placeholder} aria-hidden />;
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        {username ? username : "配置 Token"}
      </button>
      <TokenModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
