"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VenueType } from "@/generated/prisma/enums";

interface VenueFields {
  name: string;
  type: VenueType;
  address: string | null;
  bookingUrl: string | null;
  costPerHour: number | null;
  openTime: string | null;
  closeTime: string | null;
}

function parseVenueFields(formData: FormData): VenueFields {
  const name = formData.get("name");
  const type = formData.get("type");
  const address = formData.get("address");
  const bookingUrl = formData.get("bookingUrl");
  const costPerHourRaw = formData.get("costPerHour");
  const openTime = formData.get("openTime");
  const closeTime = formData.get("closeTime");

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Venue name is required");
  }
  if (
    typeof type !== "string" ||
    !Object.values(VenueType).includes(type as VenueType)
  ) {
    throw new Error("Invalid venue type");
  }

  const costPerHour =
    type === VenueType.RENTED_GYM &&
    typeof costPerHourRaw === "string" &&
    costPerHourRaw.trim() !== ""
      ? Math.round(parseFloat(costPerHourRaw) * 100) // dollars → cents
      : null;

  return {
    name: name.trim(),
    type: type as VenueType,
    address:
      typeof address === "string" && address.trim() !== ""
        ? address.trim()
        : null,
    bookingUrl:
      typeof bookingUrl === "string" && bookingUrl.trim() !== ""
        ? bookingUrl.trim()
        : null,
    costPerHour,
    openTime:
      typeof openTime === "string" && openTime.trim() !== ""
        ? openTime.trim()
        : null,
    closeTime:
      typeof closeTime === "string" && closeTime.trim() !== ""
        ? closeTime.trim()
        : null,
  };
}

/** Builds the post-action redirect target, preserving which team page to return to (if any). */
function venuesRedirectTarget(formData: FormData): string {
  const from = formData.get("from");
  return typeof from === "string" && from.trim() !== ""
    ? `/venues?from=${encodeURIComponent(from.trim())}`
    : "/venues";
}

export async function createVenue(formData: FormData): Promise<void> {
  const data = parseVenueFields(formData);

  await prisma.venue.create({ data });

  redirect(venuesRedirectTarget(formData));
}

export async function updateVenue(
  venueId: string,
  formData: FormData,
): Promise<void> {
  const data = parseVenueFields(formData);

  await prisma.venue.update({ where: { id: venueId }, data });

  redirect(venuesRedirectTarget(formData));
}

export async function deleteVenue(
  venueId: string,
  formData: FormData,
): Promise<void> {
  const sessionCount = await prisma.session.count({ where: { venueId } });
  if (sessionCount > 0) {
    throw new Error(
      `Cannot delete this venue — ${sessionCount} session(s) still reference it.`,
    );
  }

  await prisma.venue.delete({ where: { id: venueId } });

  redirect(venuesRedirectTarget(formData));
}
