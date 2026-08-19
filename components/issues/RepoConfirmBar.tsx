"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { repoDraftFromWorkspace } from "@/lib/workspace/listReady";
import styles from "./RepoConfirmBar.module.css";

export function RepoConfirmBar({
  disabled = false,
  retainStoredRepo = true,
}: {
  disabled?: boolean;
  /** When false, leave the repo field empty so last visit's repo is not reused. */
  retainStoredRepo?: boolean;
}) {
  const { org, repo, commitRepo } = useWorkspace();
  const [draftOrg, setDraftOrg] = useState(org);
  const [draftRepo, setDraftRepo] = useState(() =>
    repoDraftFromWorkspace(repo, retainStoredRepo),
  );

  useEffect(() => {
    setDraftOrg(org);
  }, [org]);

  useEffect(() => {
    if (!retainStoredRepo) return;
    setDraftRepo(repo);
  }, [repo, retainStoredRepo]);

  function confirm() {
    commitRepo({ org: draftOrg, repo: draftRepo });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm();
    }
  }

  const canConfirm =
    !disabled && Boolean(draftOrg.trim() && draftRepo.trim());

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
          placeholder="仓库"
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
