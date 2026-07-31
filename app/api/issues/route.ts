import { NextRequest, NextResponse } from "next/server";
import { parseIssueQuery } from "@/lib/issues/parseQuery";
import { getIssueRepository } from "@/lib/issues/repository";

export async function GET(req: NextRequest) {
  const query = parseIssueQuery(req.nextUrl.searchParams);
  if (!query) {
    return NextResponse.json(
      { message: "org and repo are required" },
      { status: 400 },
    );
  }

  const items = await getIssueRepository().list(query);
  return NextResponse.json({ items });
}
