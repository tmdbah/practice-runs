import type { JSX } from "react";
import { notFound } from "next/navigation";
import { TeamGrid } from "@/components/TeamGrid";
import { getTeamGrid } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { VenueSummary } from "@/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<{ title: string }> {
  const { slug } = await params;
  return { title: `${slug} – Practice Runs` };
}

export default async function TeamPage({
  params,
}: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const data = await getTeamGrid(slug);

  if (!data) {
    notFound();
  }

  const team = await prisma.team.findUnique({ where: { slug } });

  const [rawSessions, rawVenues] = await Promise.all([
    team
      ? prisma.session.findMany({
          where: { teamId: team.id },
          orderBy: { date: "asc" },
          include: sessionInclude,
        })
      : Promise.resolve([]),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
  ]);

  const sessions = rawSessions.map(toSessionResponse);

  const venues: VenueSummary[] = rawVenues.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    address: v.address,
    bookingUrl: v.bookingUrl,
    costPerSession: v.costPerSession,
  }));

  return <TeamGrid data={data} initialSessions={sessions} venues={venues} />;
}
