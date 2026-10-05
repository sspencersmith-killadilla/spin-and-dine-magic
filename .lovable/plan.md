# Restaurant Roulette

A one-page site: enter an address, set filters, see every matching restaurant nearby, then spin to have one picked for you.

## What the user sees

1. **Address box** with suggestions as you type (Google address autocomplete).
2. **Filters panel**
   - Cuisine / diet chips: Spicy, Vegetarian, Vegan, Gluten-free, plus cuisine types (Mexican, Thai, Indian, Italian, Chinese, Japanese, Burgers, Pizza, BBQ...)
   - Price: $ / $$ / $$$ / $$$$ (multi-select)
   - Minimum rating slider and an "Open now" switch
   - Distance slider: 1 to 10 miles (default 5)
3. **Results list**: name, rating, price, distance, address, open/closed. Tap a restaurant to remove it from the spin.
4. **Picker** with a toggle between:
   - **Slot machine**: reel of names spins fast, slows down and clunks onto the winner.
   - **Wheel of fortune**: colored wheel with up to ~16 slices (random sample if more), spins and eases to a stop under a pointer.
5. **Winner card**: confetti, photo, rating, address, "Get directions" (opens Google Maps) and "Spin again".

## Visual direction

Playful retro Vegas diner: deep cherry red and cream, gold marquee lights around the picker, chunky display font for headings. Works on phones.

## How filters work

- Price, rating, open-now and distance use real Google data.
- Cuisines use Google's restaurant types (e.g. thai_restaurant).
- Vegetarian / vegan use Google's "serves vegetarian food" flag plus vegan restaurant types.
- "Spicy" and "Gluten-free" aren't tracked by Google, so they map to likely cuisines (Spicy = Thai, Indian, Mexican, Szechuan, Korean...) and text search keywords. This is a best guess, labeled as such.

## Cost note

Google charges per search after its free monthly amount. To keep costs down: one search per address/filter change (no live re-searching), results cached briefly, max 60 restaurants per search, and the address suggestions are debounced. No login is planned, so anyone with the link could use searches; we can add sign-in later if that becomes a concern.

## Technical details

- Connect the Google Maps Platform connector (managed by Lovable).
- Server functions (`src/lib/places.functions.ts`) calling the connector gateway:
  - `autocompleteAddress` -> Places API (New) `places:autocomplete`
  - `getPlaceLocation` -> place details (location only)
  - `searchRestaurants` -> `places:searchNearby` with `locationRestriction.circle` (radius in meters, max 20/call; split into several includedTypes calls / `searchText` with `locationRestriction` paging to reach up to 60), field mask limited to id, displayName, rating, priceLevel, location, formattedAddress, currentOpeningHours.openNow, servesVegetarianFood, types, photos (first only), googleMapsUri.
  - `getPhoto` for the winner only.
  - Input validated with zod; 403 errors surfaced clearly.
- Distance computed with haversine and filtered client-side; rating/price/open-now filtered client-side on the fetched set.
- Picker components: `SlotMachine.tsx` (CSS transform reel with cubic-bezier easing) and `FortuneWheel.tsx` (SVG wheel, rotation computed so the chosen slice lands under the pointer). Winner chosen with `crypto.getRandomValues` before animation starts.
- Design tokens in `src/styles.css`, fonts via `<link>` in `__root.tsx`, page head metadata on `/`.
