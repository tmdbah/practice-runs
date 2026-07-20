import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: { findMany: vi.fn() },
  },
}));

import { getVenues } from "@/lib/venues";
import { prisma } from "@/lib/prisma";

const mockVenueFindMany = vi.mocked(prisma.venue.findMany);

function makeVenue(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    name: "INSZN",
    type: "RENTED_GYM" as const,
    address: "Chicago, IL",
    bookingUrl: "https://insznbasketball.com",
    costPerSession: 10000,
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
        costPerSession: 10000,
      },
    ]);
  });

  it("should return an empty array when there are no venues", async () => {
    mockVenueFindMany.mockResolvedValueOnce([]);

    const result = await getVenues();

    expect(result).toEqual([]);
  });
});
