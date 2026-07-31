import { NextRequest, NextResponse } from "next/server";
import { fetchGitCodeUser, GitCodeHttpError } from "@/lib/gitcode/client";

export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = (await req.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ message: "invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ message: "token is required" }, { status: 400 });
  }

  try {
    const user = await fetchGitCodeUser(token);
    return NextResponse.json({
      username: user.login,
      name: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
    });
  } catch (err) {
    if (err instanceof GitCodeHttpError) {
      const status = err.status === 403 ? 401 : err.status >= 500 ? 502 : 401;
      return NextResponse.json({ message: err.message }, { status });
    }
    return NextResponse.json(
      { message: "无法连接 GitCode，请稍后重试" },
      { status: 502 },
    );
  }
}
