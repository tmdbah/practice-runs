"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VenueType } from "@/generated/prisma/enums";

export async function createVenue(formData: FormData): Promise<void> {
  const name = formData.get("name");
  const type = formData.get("type");
  const address = formData.get("address");
  const bookingUrl = formData.get("bookingUrl");
  const costPerSessionRaw = formData.get("costPerSession");

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Venue name is required");
  }
  if (
    typeof type !== "string" ||
    !Object.values(VenueType).includes(type as VenueType)
  ) {
    throw new Error("Invalid venue type");
  }

  const costPerSession =
    type === VenueType.RENTED_GYM &&
    typeof costPerSessionRaw === "string" &&
    costPerSessionRaw.trim() !== ""
      ? Math.round(parseFloat(costPerSessionRaw) * 100) // dollars → cents
      : null;

  await prisma.venue.create({
    data: {
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
      costPerSession,
    },
  });

  redirect("/admin/venues");
}
