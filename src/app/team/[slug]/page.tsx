import type { JSX } from "react";
import { notFound } from "next/navigation";
import { TeamGrid } from "@/components/TeamGrid";
import { getTeamGrid } from "@/lib/teams";
import { getSessionsForTeam } from "@/lib/sessions";
import { getVenues } from "@/lib/venues";

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

  const [sessions, venues] = await Promise.all([
    getSessionsForTeam(data.team.id),
    getVenues(),
  ]);

  return <TeamGrid data={data} initialSessions={sessions} venues={venues} />;
}
