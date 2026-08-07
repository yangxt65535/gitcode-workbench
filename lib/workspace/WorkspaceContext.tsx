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
  commitRepo: (next: { org: string; repo: string }) => void;
  /** Update org only; keep existing repo so other modules are undisturbed. */
  commitOrg: (org: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [org, setOrgState] = useState("");
  const [repo, setRepoState] = useState("");

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
  }, []);

  const commitOrg = useCallback(
    (nextOrg: string) => {
      commitRepo({ org: nextOrg, repo });
    },
    [commitRepo, repo],
  );

  const value = useMemo(
    () => ({ org, repo, commitRepo, commitOrg }),
    [org, repo, commitRepo, commitOrg],
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
