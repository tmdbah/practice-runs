import Link from "next/link";
import { prisma } from "@/lib/prisma";

const VENUE_TYPE_LABELS: Record<string, string> = {
  RENTED_GYM: "Rented Gym",
  OPEN_GYM: "Open Gym",
  PARK: "Park",
};

export default async function AdminVenuesPage(): Promise<React.ReactElement> {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Link
          href="/admin/venues/new"
          className="rounded-md bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-sm font-semibold transition-colors"
        >
          + Add Venue
        </Link>
      </div>

      {venues.length === 0 ? (
        <p className="text-gray-400">No venues yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {venues.map((venue) => (
            <li
              key={venue.id}
              className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{venue.name}</span>
                <span className="text-xs text-gray-400 bg-gray-700 rounded px-2 py-0.5">
                  {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                </span>
              </div>
              {venue.address && (
                <p className="text-sm text-gray-400 mt-1">{venue.address}</p>
              )}
              {venue.costPerSession != null && (
                <p className="text-sm text-gray-400 mt-1">
                  Typical cost: ${(venue.costPerSession / 100).toFixed(2)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
