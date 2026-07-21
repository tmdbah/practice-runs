import type { JSX } from "react";
import { notFound } from "next/navigation";
import { getTeamGrid } from "@/lib/teams";
import { getSessionForTeam } from "@/lib/sessions";
import { SessionDetailView } from "@/components/SessionDetailView";

interface PageProps {
  params: Promise<{ slug: string; sessionId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<{ title: string }> {
  const { slug } = await params;
  return { title: `Session – ${slug} – Practice Runs` };
}

export default async function SessionDetailPage({
  params,
}: PageProps): Promise<JSX.Element> {
  const { slug, sessionId } = await params;
  const data = await getTeamGrid(slug);

  if (!data) {
    notFound();
  }

  const session = await getSessionForTeam(data.team.id, sessionId);

  if (!session) {
    notFound();
  }

  return (
    <SessionDetailView
      slug={slug}
      teamName={data.team.name}
      players={data.players}
      initialSession={session}
    />
  );
}
