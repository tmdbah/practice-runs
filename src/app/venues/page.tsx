import Link from "next/link";
import { getVenues } from "@/lib/venues";
import { formatTime } from "@/lib/format-time";
import { VENUE_TYPE_LABELS } from "@/types/api";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function VenuesPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { from } = await searchParams;
  const venues = await getVenues();
  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : "";

  return (
    <div className="min-h-screen bg-bg text-text px-3 py-4 flex justify-center">
      <div className="w-full max-w-md lg:max-w-xl">
        {from && (
          <Link
            href={`/team/${from}`}
            className="flex items-center gap-1 text-xs text-text-mute hover:text-text transition-colors mb-3"
          >
            <span aria-hidden="true">‹</span> Back to Grid
          </Link>
        )}

        <header className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-surface border border-border">
          <div>
            <div className="text-sm font-bold leading-tight">Venues</div>
            <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
              All Locations
            </div>
          </div>
          <Link
            href={`/venues/new${fromQuery}`}
            className="rounded-full bg-accent hover:bg-accent-dim text-bg text-xs font-bold px-3 py-1.5 transition-colors"
          >
            + Add Venue
          </Link>
        </header>

        {venues.length === 0 ? (
          <p className="text-text-dim text-sm">No venues yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {venues.map((venue) => (
              <li
                key={venue.id}
                className="rounded-xl bg-surface border border-border px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{venue.name}</span>
                  <span className="text-xs bg-gold-soft text-gold rounded px-2 py-0.5">
                    {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                  </span>
                </div>
                {venue.address && (
                  <p className="text-sm text-text-dim mt-1">
                    {venue.address}
                  </p>
                )}
                {venue.costPerHour != null && (
                  <p className="text-sm text-text-dim mt-1">
                    Cost: ${(venue.costPerHour / 100).toFixed(2)}/hr
                  </p>
                )}
                {venue.openTime && venue.closeTime && (
                  <p className="text-sm text-text-dim mt-1">
                    Hours: {formatTime(venue.openTime)} –{" "}
                    {formatTime(venue.closeTime)}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs font-medium">
                  <Link
                    href={`/venues/${venue.id}/edit${fromQuery}`}
                    className="text-accent hover:text-accent-dim transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/venues/${venue.id}/delete${fromQuery}`}
                    className="text-danger hover:opacity-80 transition-opacity"
                  >
                    Delete
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
