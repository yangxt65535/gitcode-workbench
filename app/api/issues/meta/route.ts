import { NextRequest, NextResponse } from "next/server";
import { extractBearer } from "@/lib/issues/authHeader";
import { getIssueRepository } from "@/lib/issues/repository";
import { GitCodeHttpError } from "@/lib/gitcode/client";

export async function GET(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ message: "token required" }, { status: 401 });
  }

  const org = req.nextUrl.searchParams.get("org")?.trim() ?? "";
  const repo = req.nextUrl.searchParams.get("repo")?.trim() ?? "";
  if (!org || !repo) {
    return NextResponse.json(
      { message: "org and repo are required" },
      { status: 400 },
    );
  }

  try {
    const meta = await getIssueRepository(token).meta(org, repo);
    return NextResponse.json({ meta });
  } catch (err) {
    if (err instanceof GitCodeHttpError) {
      const status =
        err.status === 404 ? 404 : err.status === 401 || err.status === 403 ? 401 : 502;
      return NextResponse.json({ message: err.message }, { status });
    }
    return NextResponse.json(
      { message: "无法加载 Issues，请稍后重试" },
      { status: 502 },
    );
  }
}
