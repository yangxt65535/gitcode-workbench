"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { TextInput } from "@/components/ui/TextInput";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import styles from "./RepoInputs.module.css";

export function RepoInputs() {
  const { org, repo, commitRepo } = useWorkspace();
  const [draftOrg, setDraftOrg] = useState(org);
  const [draftRepo, setDraftRepo] = useState(repo);

  useEffect(() => {
    setDraftOrg(org);
    setDraftRepo(repo);
  }, [org, repo]);

  function commitDraft() {
    commitRepo({ org: draftOrg, repo: draftRepo });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  return (
    <div className={styles.inputs}>
      <div className={styles.field}>
        <TextInput
          value={draftOrg}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDraftOrg(e.target.value)
          }
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          placeholder="org"
          aria-label="组织"
        />
      </div>
      <div className={styles.field}>
        <TextInput
          value={draftRepo}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDraftRepo(e.target.value)
          }
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          placeholder="repo"
          aria-label="仓库"
        />
      </div>
    </div>
  );
}
