import { NextRequest, NextResponse } from "next/server";
import { getIssueRepository } from "@/lib/issues/repository";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const org = sp.get("org")?.trim() ?? "";
  const repo = sp.get("repo")?.trim() ?? "";
  if (!org || !repo) {
    return NextResponse.json(
      { message: "org and repo are required" },
      { status: 400 },
    );
  }

  const meta = await getIssueRepository().meta(org, repo);
  return NextResponse.json({ meta });
}
