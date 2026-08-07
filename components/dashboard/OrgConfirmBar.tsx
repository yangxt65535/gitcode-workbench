"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import styles from "./OrgConfirmBar.module.css";

type OrgConfirmBarProps = {
  disabled?: boolean;
  /** Committed repo filter text; empty means all repos. */
  repo: string;
  onConfirmRepo: (repo: string) => void;
};

export function OrgConfirmBar({
  disabled = false,
  repo,
  onConfirmRepo,
}: OrgConfirmBarProps) {
  const { org, commitOrg } = useWorkspace();
  const [draftOrg, setDraftOrg] = useState(org);
  const [draftRepo, setDraftRepo] = useState(repo);

  useEffect(() => {
    setDraftOrg(org);
  }, [org]);

  useEffect(() => {
    setDraftRepo(repo);
  }, [repo]);

  function confirm() {
    commitOrg(draftOrg);
    onConfirmRepo(draftRepo.trim());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm();
    }
  }

  const canConfirm = !disabled && Boolean(draftOrg.trim());

  return (
    <div className={styles.bar}>
      <div className={styles.fields}>
        <TextInput
          value={draftOrg}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDraftOrg(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="组织"
          aria-label="组织"
        />
        <TextInput
          value={draftRepo}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDraftRepo(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="仓库（空=全部）"
          aria-label="仓库"
        />
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={!canConfirm}
        onClick={confirm}
      >
        确认
      </Button>
    </div>
  );
}
