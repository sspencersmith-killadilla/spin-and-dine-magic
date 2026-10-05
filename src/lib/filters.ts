export type Chip = { id: string; label: string; types: string[]; keyword?: string; guess?: boolean };

export const DIET_CHIPS: Chip[] = [
  {
    id: "spicy",
    label: "Spicy",
    types: ["thai_restaurant", "indian_restaurant", "mexican_restaurant", "korean_restaurant"],
    keyword: "spicy",
    guess: true,
  },
  { id: "vegetarian", label: "Vegetarian", types: ["vegetarian_restaurant", "vegan_restaurant"] },
  { id: "vegan", label: "Vegan", types: ["vegan_restaurant"], keyword: "vegan" },
  { id: "glutenfree", label: "Gluten-free", types: [], keyword: "gluten free", guess: true },
];

export const CUISINE_CHIPS: Chip[] = [
  { id: "mexican", label: "Mexican", types: ["mexican_restaurant"] },
  { id: "thai", label: "Thai", types: ["thai_restaurant"] },
  { id: "indian", label: "Indian", types: ["indian_restaurant"] },
  { id: "italian", label: "Italian", types: ["italian_restaurant"] },
  { id: "chinese", label: "Chinese", types: ["chinese_restaurant"] },
  { id: "japanese", label: "Japanese", types: ["japanese_restaurant", "sushi_restaurant", "ramen_restaurant"] },
  { id: "burgers", label: "Burgers", types: ["hamburger_restaurant"] },
  { id: "pizza", label: "Pizza", types: ["pizza_restaurant"] },
  { id: "bbq", label: "BBQ", types: ["barbecue_restaurant"] },
  { id: "seafood", label: "Seafood", types: ["seafood_restaurant"] },
];

export const ALL_CHIPS = [...DIET_CHIPS, ...CUISINE_CHIPS];

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function randomIndex(n: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}
