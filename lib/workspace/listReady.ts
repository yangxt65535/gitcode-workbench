/** Issue/PR lists fetch only after the user confirms org+repo in this session. */
export function isConfirmedRepoListReady(input: {
  org: string;
  repo: string;
  repoConfirmed: boolean;
}): boolean {
  return (
    input.repoConfirmed &&
    input.org.trim() !== "" &&
    input.repo.trim() !== ""
  );
}

/** Prefill the repo input only after this-session confirmation. */
export function repoDraftFromWorkspace(
  storedRepo: string,
  retainStoredRepo: boolean,
): string {
  return retainStoredRepo ? storedRepo : "";
}
