import { createVenue } from "./actions";

export default function NewVenuePage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Venue</h1>
      <form action={createVenue} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-gray-300">
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-300">
            Type *
          </label>
          <select
            id="type"
            name="type"
            required
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="RENTED_GYM">Rented Gym</option>
            <option value="OPEN_GYM">Open Gym</option>
            <option value="PARK">Park</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="address"
            className="text-sm font-medium text-gray-300"
          >
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="bookingUrl"
            className="text-sm font-medium text-gray-300"
          >
            Booking URL
          </label>
          <input
            id="bookingUrl"
            name="bookingUrl"
            type="url"
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="costPerSession"
            className="text-sm font-medium text-gray-300"
          >
            Typical cost per session ($) — Rented Gym only
          </label>
          <input
            id="costPerSession"
            name="costPerSession"
            type="number"
            min="0"
            step="0.01"
            placeholder="100.00"
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-md bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-4 py-2 font-semibold transition-colors"
        >
          Add Venue
        </button>
      </form>
    </main>
  );
}
