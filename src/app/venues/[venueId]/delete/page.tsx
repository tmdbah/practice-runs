import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueById } from "@/lib/venues";
import { deleteVenue } from "../../actions";

interface PageProps {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function DeleteVenuePage({
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
  const boundDeleteVenue = deleteVenue.bind(null, venueId);

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
          <div className="text-sm font-bold leading-tight">Delete Venue</div>
          <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
            {venue.name}
          </div>
        </header>

        <div className="rounded-xl bg-surface border border-border p-4">
          <p className="text-text-dim text-sm mb-4">
            Delete &ldquo;{venue.name}&rdquo;?{" "}
            <span className="text-danger">This can&apos;t be undone.</span>
          </p>
          <div className="flex gap-3">
            <form action={boundDeleteVenue}>
              <input type="hidden" name="from" value={from ?? ""} />
              <button
                type="submit"
                className="rounded-xl bg-danger hover:opacity-90 text-bg font-semibold px-4 py-2 transition-opacity"
              >
                Delete
              </button>
            </form>
            <Link
              href={`/venues${fromQuery}`}
              className="rounded-xl border border-border text-text-dim hover:text-text hover:border-border-strong font-medium px-4 py-2 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
