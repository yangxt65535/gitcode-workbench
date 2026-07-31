const TOKEN_KEY = "gitcode.workbench.token";
const USERNAME_KEY = "gitcode.workbench.username";

export type AuthSession = {
  token: string;
  username: string;
};

export function readAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY)?.trim() ?? "";
  const username = localStorage.getItem(USERNAME_KEY)?.trim() ?? "";
  if (!token || !username) return null;
  return { token, username };
}

export function writeAuth(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token.trim());
  localStorage.setItem(USERNAME_KEY, session.username.trim());
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
