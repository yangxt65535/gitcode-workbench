"use client";

import { type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./ForkStatusCard.module.css";

type ForkStatusCardProps = {
  loading?: boolean;
  checked: boolean;
  forkOwnerDraft: string;
  onForkOwnerDraftChange: (value: string) => void;
  onConfirmForkOwner: () => void;
  disabled?: boolean;
};

export function ForkStatusCard({
  loading,
  checked,
  forkOwnerDraft,
  onForkOwnerDraftChange,
  onConfirmForkOwner,
  disabled,
}: ForkStatusCardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onConfirmForkOwner();
    }
  }

  const canConfirm =
    !disabled &&
    !loading &&
    checked &&
    Boolean(forkOwnerDraft.trim());

  return (
    <div className={styles.bar}>
      <div className={styles.fields}>
        <TextInput
          value={forkOwnerDraft}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onForkOwnerDraftChange(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Fork 用户"
          disabled={disabled || loading || !checked}
          aria-label="Fork 用户"
        />
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={!canConfirm}
        onClick={onConfirmForkOwner}
      >
        确认
      </Button>
    </div>
  );
}
