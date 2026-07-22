import Link from "next/link";
import { createVenue } from "../actions";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function NewVenuePage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { from } = await searchParams;
  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : "";

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
          <div className="text-sm font-bold leading-tight">Add Venue</div>
          <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
            New Location
          </div>
        </header>

        <div className="rounded-xl bg-surface border border-border p-4">
          <form action={createVenue} className="flex flex-col gap-4">
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
                  className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-text text-sm focus:outline-none focus:border-accent [color-scheme:dark]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent hover:bg-accent-dim text-bg font-semibold py-3 transition-colors"
            >
              Add Venue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
