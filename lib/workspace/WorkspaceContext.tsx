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
  setOrg: (org: string) => void;
  setRepo: (repo: string) => void;
  commitRepo: () => void;
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

  const setOrg = useCallback((next: string) => {
    setOrgState(next);
  }, []);

  const setRepo = useCallback((next: string) => {
    setRepoState(next);
  }, []);

  const commitRepo = useCallback(() => {
    const next = { org: org.trim(), repo: repo.trim() };
    writeWorkspace(next);
    setOrgState(next.org);
    setRepoState(next.repo);
  }, [org, repo]);

  const value = useMemo(
    () => ({ org, repo, setOrg, setRepo, commitRepo }),
    [org, repo, setOrg, setRepo, commitRepo],
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
