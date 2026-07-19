import type { JSX } from "react";
import { notFound } from "next/navigation";
import { TeamGrid } from "@/components/TeamGrid";
import { getTeamGrid } from "@/lib/teams";

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

  return <TeamGrid data={data} />;
}
