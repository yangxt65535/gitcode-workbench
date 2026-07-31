import { GitCodeIssueRepository } from "./gitcodeIssueRepository";
import type { IssueRepository } from "./types";

export function getIssueRepository(token: string): IssueRepository {
  return new GitCodeIssueRepository(token);
}
