export type Chip = { id: string; label: string; types: string[]; keyword?: string; guess?: boolean };

export const CRAVING_CHIPS: Chip[] = [
  {
    id: "spicy",
    label: "Spicy",
    types: ["thai_restaurant", "indian_restaurant", "mexican_restaurant", "korean_restaurant"],
    keyword: "spicy",
    guess: true,
  },
  { id: "comfort", label: "Comfort food", types: ["american_restaurant"], keyword: "comfort food", guess: true },
  { id: "healthy", label: "Healthy", types: [], keyword: "healthy", guess: true },
  { id: "dessert", label: "Sweet tooth", types: ["dessert_shop", "ice_cream_shop"] },
  { id: "coffee", label: "Coffee & pastries", types: ["coffee_shop", "cafe", "bakery"] },
  { id: "noodles", label: "Noodles", types: ["ramen_restaurant", "vietnamese_restaurant"], keyword: "noodles" },
  { id: "tacos", label: "Tacos", types: ["mexican_restaurant"], keyword: "tacos" },
  { id: "wings", label: "Wings", types: [], keyword: "chicken wings" },
  { id: "sandwiches", label: "Sandwiches", types: ["sandwich_shop"] },
  { id: "salads", label: "Salads", types: [], keyword: "salad" },
  { id: "soup", label: "Soup", types: [], keyword: "soup" },
];

export const DIET_CHIPS: Chip[] = [
  { id: "vegetarian", label: "Vegetarian", types: ["vegetarian_restaurant", "vegan_restaurant"] },
  { id: "vegan", label: "Vegan", types: ["vegan_restaurant"], keyword: "vegan" },
  { id: "glutenfree", label: "Gluten-free", types: [], keyword: "gluten free", guess: true },
  { id: "halal", label: "Halal", types: [], keyword: "halal", guess: true },
  { id: "kosher", label: "Kosher", types: [], keyword: "kosher", guess: true },
  { id: "dairyfree", label: "Dairy-free", types: [], keyword: "dairy free", guess: true },
  { id: "keto", label: "Low-carb / keto", types: [], keyword: "keto low carb", guess: true },
];

export const CUISINE_CHIPS: Chip[] = [
  { id: "mexican", label: "Mexican", types: ["mexican_restaurant"] },
  { id: "thai", label: "Thai", types: ["thai_restaurant"] },
  { id: "indian", label: "Indian", types: ["indian_restaurant"] },
  { id: "italian", label: "Italian", types: ["italian_restaurant"] },
  { id: "chinese", label: "Chinese", types: ["chinese_restaurant"] },
  { id: "japanese", label: "Japanese", types: ["japanese_restaurant", "sushi_restaurant", "ramen_restaurant"] },
  { id: "korean", label: "Korean", types: ["korean_restaurant"] },
  { id: "vietnamese", label: "Vietnamese", types: ["vietnamese_restaurant"] },
  { id: "greek", label: "Greek", types: ["greek_restaurant"] },
  { id: "mediterranean", label: "Mediterranean", types: ["mediterranean_restaurant"] },
  { id: "middleeastern", label: "Middle Eastern", types: ["middle_eastern_restaurant"] },
  { id: "lebanese", label: "Lebanese", types: ["lebanese_restaurant"] },
  { id: "turkish", label: "Turkish", types: ["turkish_restaurant"] },
  { id: "french", label: "French", types: ["french_restaurant"] },
  { id: "spanish", label: "Spanish", types: ["spanish_restaurant"] },
  { id: "american", label: "American", types: ["american_restaurant"] },
  { id: "southern", label: "Southern / soul food", types: [], keyword: "soul food southern" },
  { id: "caribbean", label: "Caribbean", types: [], keyword: "caribbean" },
  { id: "ethiopian", label: "Ethiopian", types: [], keyword: "ethiopian" },
  { id: "brazilian", label: "Brazilian", types: ["brazilian_restaurant"] },
  { id: "indonesian", label: "Indonesian", types: ["indonesian_restaurant"] },
  { id: "burgers", label: "Burgers", types: ["hamburger_restaurant"] },
  { id: "pizza", label: "Pizza", types: ["pizza_restaurant"] },
  { id: "bbq", label: "BBQ", types: ["barbecue_restaurant"] },
  { id: "seafood", label: "Seafood", types: ["seafood_restaurant"] },
  { id: "steak", label: "Steakhouse", types: ["steak_house"] },
  { id: "brunch", label: "Breakfast & brunch", types: ["breakfast_restaurant", "brunch_restaurant"] },
  { id: "bakery", label: "Bakery / cafe", types: ["bakery", "cafe"] },
  { id: "deli", label: "Deli", types: ["sandwich_shop"], keyword: "deli" },
];

export const CHIP_GROUPS = [
  { id: "cravings", title: "Cravings", chips: CRAVING_CHIPS },
  { id: "diet", title: "Diet", chips: DIET_CHIPS },
  { id: "cuisine", title: "Cuisine", chips: CUISINE_CHIPS },
] as const;

export const ALL_CHIPS = [...CRAVING_CHIPS, ...DIET_CHIPS, ...CUISINE_CHIPS];

export type Meal = "any" | "breakfast" | "lunch" | "dinner";
export const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "any", label: "Any" },
];

export function defaultMealForNow(d = new Date()): Meal {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60 + 30) return "breakfast";
  if (m < 16 * 60) return "lunch";
  return "dinner";
}

export type FastFood = "include" | "exclude" | "only";

export const FAST_FOOD_CHAINS = [
  "mcdonald", "burger king", "wendy", "taco bell", "subway", "kfc", "popeyes", "chick-fil-a",
  "arby", "sonic drive", "jack in the box", "carl's jr", "hardee", "dairy queen", "white castle",
  "domino", "pizza hut", "little caesars", "papa john", "jimmy john", "firehouse subs",
  "jersey mike", "panda express", "five guys", "in-n-out", "whataburger", "culver",
  "raising cane", "wingstop", "del taco", "el pollo loco", "checkers", "rally's", "steak 'n shake",
  "chipotle", "qdoba", "long john silver", "church's", "zaxby", "bojangles", "krystal",
];

export function isFastFood(p: { name: string; types: string[] }) {
  if (p.types.includes("fast_food_restaurant")) return true;
  const n = p.name.toLowerCase().replace(/’/g, "'");
  return FAST_FOOD_CHAINS.some((c) => n.includes(c));
}

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
  return (a[0] ?? 0) % n;
}
