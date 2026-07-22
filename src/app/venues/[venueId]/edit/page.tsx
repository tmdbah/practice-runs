import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueById } from "@/lib/venues";
import { updateVenue } from "../../actions";

interface PageProps {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function EditVenuePage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { venueId } = await params;
  const { from } = await searchParams;
  const venue = await getVenueById(venueId);

  if (!venue) {
    notFound();
  }

  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : "";
  const boundUpdateVenue = updateVenue.bind(null, venueId);

  return (
    <div className="min-h-screen bg-bg text-text px-3 py-4 flex justify-center">
      <div className="w-full max-w-md lg:max-w-xl">
        <Link
          href={`/venues${fromQuery}`}
          className="flex items-center gap-1 text-xs text-text-mute hover:text-text transition-colors mb-3"
        >
          <span aria-hidden="true">‹</span> Back to Venues
        </Link>

        <header className="mb-4 px-3 py-2 rounded-xl bg-surface border border-border">
          <div className="text-sm font-bold leading-tight">Edit Venue</div>
          <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
            {venue.name}
          </div>
        </header>

        <div className="rounded-xl bg-surface border border-border p-4">
          <form action={boundUpdateVenue} className="flex flex-col gap-4">
            <input type="hidden" name="from" value={from ?? ""} />
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-xs font-medium text-text-dim">
                Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={venue.name}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-xs font-medium text-text-dim">
                Type *
              </label>
              <select
                id="type"
                name="type"
                required
                defaultValue={venue.type}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
              >
                <option value="RENTED_GYM">Rented Gym</option>
                <option value="OPEN_GYM">Open Gym</option>
                <option value="PARK">Park</option>
                <option value="RECREATION_CENTER">Recreation Center</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="address"
                className="text-xs font-medium text-text-dim"
              >
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                defaultValue={venue.address ?? ""}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="bookingUrl"
                className="text-xs font-medium text-text-dim"
              >
                Booking URL
              </label>
              <input
                id="bookingUrl"
                name="bookingUrl"
                type="url"
                defaultValue={venue.bookingUrl ?? ""}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="costPerHour"
                className="text-xs font-medium text-text-dim"
              >
                Cost per hour ($) — Rented Gym only
              </label>
              <input
                id="costPerHour"
                name="costPerHour"
                type="number"
                min="0"
                step="0.01"
                placeholder="50.00"
                defaultValue={
                  venue.costPerHour != null
                    ? (venue.costPerHour / 100).toFixed(2)
                    : ""
                }
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label
                  htmlFor="openTime"
                  className="text-xs font-medium text-text-dim"
                >
                  Opens
                </label>
                <input
                  id="openTime"
                  name="openTime"
                  type="time"
                  defaultValue={venue.openTime ?? ""}
                  className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent [color-scheme:dark]"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label
                  htmlFor="closeTime"
                  className="text-xs font-medium text-text-dim"
                >
                  Closes
                </label>
                <input
                  id="closeTime"
                  name="closeTime"
                  type="time"
                  defaultValue={venue.closeTime ?? ""}
                  className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent [color-scheme:dark]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent hover:bg-accent-dim text-bg font-semibold py-3 transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
