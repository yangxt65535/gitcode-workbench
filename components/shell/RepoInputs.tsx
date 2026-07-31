"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { TextInput } from "@/components/ui/TextInput";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import styles from "./RepoInputs.module.css";

export function RepoInputs() {
  const { org, repo, setOrg, setRepo, commitRepo } = useWorkspace();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commitRepo();
    }
  }

  return (
    <div className={styles.inputs}>
      <div className={styles.field}>
        <TextInput
          value={org}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setOrg(e.target.value)}
          onBlur={() => commitRepo()}
          onKeyDown={handleKeyDown}
          placeholder="org"
          aria-label="组织"
        />
      </div>
      <div className={styles.field}>
        <TextInput
          value={repo}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setRepo(e.target.value)}
          onBlur={() => commitRepo()}
          onKeyDown={handleKeyDown}
          placeholder="repo"
          aria-label="仓库"
        />
      </div>
    </div>
  );
}
