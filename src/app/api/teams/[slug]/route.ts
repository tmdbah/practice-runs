import { NextResponse } from "next/server";
import { getTeamGrid } from "@/lib/teams";
import type { TeamGridResponse, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse<TeamGridResponse | ApiError>> {
  const { slug } = await params;

  const data = await getTeamGrid(slug);

  if (!data) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
