import { NextRequest, NextResponse } from "next/server";
import { extractBearer } from "@/lib/issues/authHeader";
import { parseIssueQuery } from "@/lib/issues/parseQuery";
import { getIssueRepository } from "@/lib/issues/repository";
import { GitCodeHttpError } from "@/lib/gitcode/client";

export async function GET(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ message: "token required" }, { status: 401 });
  }

  const query = parseIssueQuery(req.nextUrl.searchParams);
  if (!query) {
    return NextResponse.json(
      { message: "org and repo are required" },
      { status: 400 },
    );
  }

  try {
    const items = await getIssueRepository(token).list(query);
    return NextResponse.json({ items });
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
