import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import { getVenues, getVenueById } from "@/lib/venues";
import { prisma } from "@/lib/prisma";

const mockVenueFindMany = vi.mocked(prisma.venue.findMany);
const mockVenueFindUnique = vi.mocked(prisma.venue.findUnique);

function makeVenue(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    name: "INSZN",
    type: "RENTED_GYM" as const,
    address: "Chicago, IL",
    bookingUrl: "https://insznbasketball.com",
    costPerHour: 10000,
    openTime: "06:00",
    closeTime: "21:00",
    ...overrides,
  };
}

describe("getVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query venues ordered by name", async () => {
    mockVenueFindMany.mockResolvedValueOnce([makeVenue()] as never);

    await getVenues();

    expect(mockVenueFindMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
  });

  it("should map all fields to the VenueSummary shape", async () => {
    mockVenueFindMany.mockResolvedValueOnce([makeVenue()] as never);

    const result = await getVenues();

    expect(result).toEqual([
      {
        id: "v1",
        name: "INSZN",
        type: "RENTED_GYM",
        address: "Chicago, IL",
        bookingUrl: "https://insznbasketball.com",
        costPerHour: 10000,
        openTime: "06:00",
        closeTime: "21:00",
      },
    ]);
  });

  it("should return an empty array when there are no venues", async () => {
    mockVenueFindMany.mockResolvedValueOnce([]);

    const result = await getVenues();

    expect(result).toEqual([]);
  });
});

describe("getVenueById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query by id", async () => {
    mockVenueFindUnique.mockResolvedValueOnce(makeVenue() as never);

    await getVenueById("v1");

    expect(mockVenueFindUnique).toHaveBeenCalledWith({
      where: { id: "v1" },
    });
  });

  it("should map all fields to the VenueSummary shape", async () => {
    mockVenueFindUnique.mockResolvedValueOnce(makeVenue() as never);

    const result = await getVenueById("v1");

    expect(result).toEqual({
      id: "v1",
      name: "INSZN",
      type: "RENTED_GYM",
      address: "Chicago, IL",
      bookingUrl: "https://insznbasketball.com",
      costPerHour: 10000,
      openTime: "06:00",
      closeTime: "21:00",
    });
  });

  it("should return null when the venue is not found", async () => {
    mockVenueFindUnique.mockResolvedValueOnce(null);

    const result = await getVenueById("missing");

    expect(result).toBeNull();
  });
});
