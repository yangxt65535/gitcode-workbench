const ORG_KEY = "gitcode.workbench.org";
const REPO_KEY = "gitcode.workbench.repo";

export function readWorkspace(): { org: string; repo: string } {
  if (typeof window === "undefined") return { org: "", repo: "" };
  return {
    org: localStorage.getItem(ORG_KEY) ?? "",
    repo: localStorage.getItem(REPO_KEY) ?? "",
  };
}

export function writeWorkspace(next: { org: string; repo: string }): void {
  localStorage.setItem(ORG_KEY, next.org.trim());
  localStorage.setItem(REPO_KEY, next.repo.trim());
}
