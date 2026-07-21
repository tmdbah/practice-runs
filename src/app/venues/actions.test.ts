import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    session: { count: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { createVenue, updateVenue, deleteVenue } from "@/app/venues/actions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const mockVenueCreate = vi.mocked(prisma.venue.create);
const mockVenueUpdate = vi.mocked(prisma.venue.update);
const mockVenueDelete = vi.mocked(prisma.venue.delete);
const mockSessionCount = vi.mocked(prisma.session.count);
const mockRedirect = vi.mocked(redirect);

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    name: "INSZN",
    type: "RENTED_GYM",
    address: "Charlotte, NC",
    bookingUrl: "https://insznbasketball.com",
    costPerHour: "50.00",
    openTime: "06:00",
    closeTime: "21:00",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(key, value);
  }
  return fd;
}

describe("createVenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw when name is missing", async () => {
    await expect(
      createVenue(makeFormData({ name: "" })),
    ).rejects.toThrow("Venue name is required");
    expect(mockVenueCreate).not.toHaveBeenCalled();
  });

  it("should throw when type is invalid", async () => {
    await expect(
      createVenue(makeFormData({ type: "BOWLING_ALLEY" })),
    ).rejects.toThrow("Invalid venue type");
    expect(mockVenueCreate).not.toHaveBeenCalled();
  });

  it("should create with all fields mapped, dollars converted to cents", async () => {
    await createVenue(makeFormData());

    expect(mockVenueCreate).toHaveBeenCalledWith({
      data: {
        name: "INSZN",
        type: "RENTED_GYM",
        address: "Charlotte, NC",
        bookingUrl: "https://insznbasketball.com",
        costPerHour: 5000,
        openTime: "06:00",
        closeTime: "21:00",
      },
    });
    expect(mockRedirect).toHaveBeenCalledWith("/venues");
  });

  it("should not compute costPerHour for non-RENTED_GYM venues", async () => {
    await createVenue(makeFormData({ type: "PARK", costPerHour: "50" }));

    expect(mockVenueCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ costPerHour: null }) }),
    );
  });

  it("should map blank optional fields to null", async () => {
    await createVenue(
      makeFormData({
        address: "",
        bookingUrl: "",
        openTime: "",
        closeTime: "",
        costPerHour: "",
      }),
    );

    expect(mockVenueCreate).toHaveBeenCalledWith({
      data: {
        name: "INSZN",
        type: "RENTED_GYM",
        address: null,
        bookingUrl: null,
        costPerHour: null,
        openTime: null,
        closeTime: null,
      },
    });
  });

  it("should redirect to /venues?from=<slug> when a from field is present", async () => {
    await createVenue(makeFormData({ from: "demo-team" }));

    expect(mockRedirect).toHaveBeenCalledWith("/venues?from=demo-team");
  });

  it("should redirect to bare /venues when from is absent", async () => {
    await createVenue(makeFormData());

    expect(mockRedirect).toHaveBeenCalledWith("/venues");
  });
});

describe("updateVenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw when name is missing, without calling update", async () => {
    await expect(
      updateVenue("v1", makeFormData({ name: "  " })),
    ).rejects.toThrow("Venue name is required");
    expect(mockVenueUpdate).not.toHaveBeenCalled();
  });

  it("should update the venue by id with all fields mapped", async () => {
    await updateVenue("v1", makeFormData());

    expect(mockVenueUpdate).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        name: "INSZN",
        type: "RENTED_GYM",
        address: "Charlotte, NC",
        bookingUrl: "https://insznbasketball.com",
        costPerHour: 5000,
        openTime: "06:00",
        closeTime: "21:00",
      },
    });
    expect(mockRedirect).toHaveBeenCalledWith("/venues");
  });

  it("should redirect to /venues?from=<slug> when a from field is present", async () => {
    await updateVenue("v1", makeFormData({ from: "demo-team" }));

    expect(mockRedirect).toHaveBeenCalledWith("/venues?from=demo-team");
  });
});

describe("deleteVenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete and redirect when no sessions reference the venue", async () => {
    mockSessionCount.mockResolvedValueOnce(0);

    await deleteVenue("v1", new FormData());

    expect(mockSessionCount).toHaveBeenCalledWith({ where: { venueId: "v1" } });
    expect(mockVenueDelete).toHaveBeenCalledWith({ where: { id: "v1" } });
    expect(mockRedirect).toHaveBeenCalledWith("/venues");
  });

  it("should throw and not delete when sessions still reference the venue", async () => {
    mockSessionCount.mockResolvedValueOnce(2);

    await expect(deleteVenue("v1", new FormData())).rejects.toThrow(
      "Cannot delete this venue — 2 session(s) still reference it.",
    );
    expect(mockVenueDelete).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("should redirect to /venues?from=<slug> when a from field is present", async () => {
    mockSessionCount.mockResolvedValueOnce(0);
    const fd = new FormData();
    fd.set("from", "demo-team");

    await deleteVenue("v1", fd);

    expect(mockRedirect).toHaveBeenCalledWith("/venues?from=demo-team");
  });
});
