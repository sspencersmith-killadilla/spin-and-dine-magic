import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function creds() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Google Maps connection is not configured.");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": maps };
}

async function gateway(path: string, init: RequestInit & { fieldMask?: string }) {
  const headers: Record<string, string> = { ...creds(), "Content-Type": "application/json" };
  if (init.fieldMask) headers["X-Goog-FieldMask"] = init.fieldMask;
  const res = await fetch(`${GATEWAY_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Maps request failed [${res.status}]: ${body}`);
    if (res.status === 403) throw new Error("Google Maps denied the request (403).");
    throw new Error(`Google Maps request failed (${res.status}).`);
  }
  return res.json();
}

export const autocompleteAddress = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ input: z.string().min(2).max(200), sessionToken: z.string().max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const json = await gateway("/places/v1/places:autocomplete", {
      method: "POST",
      fieldMask: "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      body: JSON.stringify({ input: data.input, sessionToken: data.sessionToken }),
    });
    type S = { placePrediction?: { placeId: string; text: { text: string } } };
    return ((json.suggestions ?? []) as S[])
      .filter((s) => s.placePrediction)
      .slice(0, 6)
      .map((s) => ({ placeId: s.placePrediction!.placeId, text: s.placePrediction!.text.text }));
  });

export const getPlaceLocation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ placeId: z.string().min(1).max(300), sessionToken: z.string().max(64).optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const qs = data.sessionToken ? `?sessionToken=${encodeURIComponent(data.sessionToken)}` : "";
    const json = await gateway(`/places/v1/places/${encodeURIComponent(data.placeId)}${qs}`, {
      method: "GET",
      fieldMask: "location,formattedAddress",
    });
    if (!json.location) throw new Error("Couldn't find that address.");
    return {
      lat: json.location.latitude as number,
      lng: json.location.longitude as number,
      address: (json.formattedAddress as string) ?? "",
    };
  });

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ address: z.string().min(2).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const json = await gateway(
      `/maps/api/geocode/json?address=${encodeURIComponent(data.address)}`,
      { method: "GET" },
    );
    const r = json.results?.[0];
    if (!r) throw new Error("Couldn't find that address.");
    return {
      lat: r.geometry.location.lat as number,
      lng: r.geometry.location.lng as number,
      address: r.formatted_address as string,
    };
  });

export type Restaurant = {
  id: string;
  name: string;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  lat: number;
  lng: number;
  address: string;
  openNow: boolean | null;
  vegetarian: boolean | null;
  types: string[];
  category: string;
  photo: string | null;
  mapsUrl: string;
};

const FIELDS = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "priceLevel",
  "location",
  "formattedAddress",
  "currentOpeningHours.openNow",
  "servesVegetarianFood",
  "types",
  "primaryTypeDisplayName",
  "photos",
  "googleMapsUri",
]
  .map((f) => `places.${f}`)
  .join(",");

const PRICE: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

type RawPlace = {
  id: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  location: { latitude: number; longitude: number };
  formattedAddress?: string;
  currentOpeningHours?: { openNow?: boolean };
  servesVegetarianFood?: boolean;
  types?: string[];
  primaryTypeDisplayName?: { text: string };
  photos?: { name: string }[];
  googleMapsUri?: string;
};

function toDto(p: RawPlace): Restaurant {
  return {
    id: p.id,
    name: p.displayName?.text ?? "Unnamed",
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    priceLevel: p.priceLevel ? (PRICE[p.priceLevel] ?? null) : null,
    lat: p.location.latitude,
    lng: p.location.longitude,
    address: p.formattedAddress ?? "",
    openNow: p.currentOpeningHours?.openNow ?? null,
    vegetarian: p.servesVegetarianFood ?? null,
    types: p.types ?? [],
    category: p.primaryTypeDisplayName?.text ?? "Restaurant",
    photo: p.photos?.[0]?.name ?? null,
    mapsUrl: p.googleMapsUri ?? "",
  };
}

export const searchRestaurants = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusMiles: z.number().min(0.5).max(10),
        types: z.array(z.string().regex(/^[a-z_]+$/)).max(20),
        keywords: z.array(z.string().max(40)).max(3),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const radius = Math.round(data.radiusMiles * 1609.34);
    const circle = { center: { latitude: data.lat, longitude: data.lng }, radius };
    const includedTypes = data.types.length ? data.types : ["restaurant"];

    const calls: Promise<{ places?: RawPlace[] }>[] = (["POPULARITY", "DISTANCE"] as const).map(
      (rank) =>
        gateway("/places/v1/places:searchNearby", {
          method: "POST",
          fieldMask: FIELDS,
          body: JSON.stringify({
            includedTypes,
            maxResultCount: 20,
            rankPreference: rank,
            locationRestriction: { circle },
          }),
        }),
    );
    for (const kw of data.keywords) {
      calls.push(
        gateway("/places/v1/places:searchText", {
          method: "POST",
          fieldMask: FIELDS,
          body: JSON.stringify({
            textQuery: `${kw} restaurant`,
            includedType: "restaurant",
            pageSize: 20,
            locationBias: { circle },
          }),
        }),
      );
    }
    const results = await Promise.all(calls);
    const map = new Map<string, Restaurant>();
    for (const r of results) for (const p of r.places ?? []) if (!map.has(p.id)) map.set(p.id, toDto(p));
    return [...map.values()].slice(0, 60);
  });

export const getPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ name: z.string().regex(/^places\/[^/]+\/photos\/[^/]+$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const json = await gateway(`/places/v1/${data.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
        method: "GET",
      });
      return (json.photoUri as string) ?? null;
    } catch {
      return null;
    }
  });
