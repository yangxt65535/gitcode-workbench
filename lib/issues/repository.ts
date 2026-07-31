import { MockIssueRepository } from "./mockIssueRepository";
import type { IssueRepository } from "./types";

export function getIssueRepository(): IssueRepository {
  return new MockIssueRepository();
}
