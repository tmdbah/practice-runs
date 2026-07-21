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
    costPerHour: v.costPerHour,
    openTime: v.openTime,
    closeTime: v.closeTime,
  }));
}

/** Fetches a single venue by id, mapped to the API response shape. Returns null if not found. */
export async function getVenueById(id: string): Promise<VenueSummary | null> {
  const v = await prisma.venue.findUnique({ where: { id } });
  if (!v) return null;

  return {
    id: v.id,
    name: v.name,
    type: v.type,
    address: v.address,
    bookingUrl: v.bookingUrl,
    costPerHour: v.costPerHour,
    openTime: v.openTime,
    closeTime: v.closeTime,
  };
}
