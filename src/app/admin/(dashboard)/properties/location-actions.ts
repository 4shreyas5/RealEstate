"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export interface LocationOption {
  id: string;
  name: string;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Dependent lookups for the property wizard's Location step. Each level is
 * fetched only once its parent is chosen, so the browser never receives
 * every city / locality in the country.
 */
export async function getCitiesForState(stateId: string): Promise<LocationOption[]> {
  await requireAdminUser();
  if (!ID.test(stateId)) return [];
  return prisma.city.findMany({
    where: { stateId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getLocalitiesForCity(cityId: string): Promise<LocationOption[]> {
  await requireAdminUser();
  if (!ID.test(cityId)) return [];
  return prisma.locality.findMany({
    where: { cityId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getNeighbourhoodsForLocality(localityId: string): Promise<LocationOption[]> {
  await requireAdminUser();
  if (!ID.test(localityId)) return [];
  return prisma.neighbourhood.findMany({
    where: { localityId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
