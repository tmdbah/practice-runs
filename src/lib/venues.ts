import { prisma } from "@/lib/prisma";
import type { VenueSummary } from "@/types/api";

/** Fetches all venues, ordered by name, mapped to the API response shape. */
export async function getVenues(): Promise<VenueSummary[]> {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    address: v.address,
    bookingUrl: v.bookingUrl,
    costPerSession: v.costPerSession,
  }));
}
