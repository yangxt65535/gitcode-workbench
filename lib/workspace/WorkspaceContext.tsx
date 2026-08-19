"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readWorkspace, writeWorkspace } from "./storage";

type WorkspaceContextValue = {
  org: string;
  repo: string;
  /**
   * True only after the user clicks 确认 on org+repo in this SPA session.
   * Restoring localStorage must not auto-fetch Issue/PR lists.
   */
  repoConfirmed: boolean;
  commitRepo: (next: { org: string; repo: string }) => void;
  /** Update org only; keep existing repo so other modules are undisturbed. */
  commitOrg: (org: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [org, setOrgState] = useState("");
  const [repo, setRepoState] = useState("");
  const [repoConfirmed, setRepoConfirmed] = useState(false);

  useEffect(() => {
    const stored = readWorkspace();
    setOrgState(stored.org);
    setRepoState(stored.repo);
  }, []);

  const commitRepo = useCallback((next: { org: string; repo: string }) => {
    const trimmed = { org: next.org.trim(), repo: next.repo.trim() };
    writeWorkspace(trimmed);
    setOrgState(trimmed.org);
    setRepoState(trimmed.repo);
    setRepoConfirmed(true);
  }, []);

  const commitOrg = useCallback((nextOrg: string) => {
    const trimmed = { org: nextOrg.trim(), repo };
    writeWorkspace(trimmed);
    setOrgState(trimmed.org);
  }, [repo]);

  const value = useMemo(
    () => ({ org, repo, repoConfirmed, commitRepo, commitOrg }),
    [org, repo, repoConfirmed, commitRepo, commitOrg],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
