# More choices: cravings, diets, cuisines, fast food, and meal of the day

## What the user will see

1. **Meal of the day** (new, at the top of the filters): Breakfast / Lunch / Dinner / Any. It starts on the meal that matches the current time of day (before 10:30am = Breakfast, before 4pm = Lunch, otherwise Dinner). Changing it reloads the list.
2. **Fast food** (new 3-way switch): Include / Exclude / Only fast food.
3. **More cravings**: Spicy, Comfort food, Healthy, Sweet tooth / dessert, Coffee & pastries, Noodles, Tacos, Wings, Sandwiches, Salads, Soup.
4. **More diets**: Vegetarian, Vegan, Gluten-free, Halal, Kosher, Dairy-free, Low-carb / keto.
5. **More cuisines**: adds Korean, Vietnamese, Greek, Mediterranean, Middle Eastern, French, Spanish, American, Southern / soul food, Caribbean, Ethiopian, Brazilian, Turkish, Lebanese, Indonesian, Steakhouse, Breakfast & brunch, Bakery / cafe, Deli.
6. Each group (Cravings, Diet, Cuisine) can be collapsed and shows how many are picked, plus a "Clear all" link, so the longer lists don't take over the screen.
7. Choices Google doesn't track directly (for example Halal, Keto, Dairy-free, Comfort food) get a small "best guess" mark with a short note explaining why.

## How the filtering works

- **Meal**: Google says whether a place serves breakfast, lunch or dinner. We keep places marked for the chosen meal. If Google has no info for a place, we keep it so the list doesn't get too short. Breakfast also searches breakfast, brunch, cafe and bakery places.
- **Fast food**: uses Google's "fast food restaurant" label, plus a short list of well-known chains (McDonald's, Taco Bell, Subway, etc.) in case a chain isn't labeled.
  - Exclude: hides both.
  - Only: searches fast food places only.
- **Cravings, diets and cuisines**: use Google's restaurant types where one exists. Otherwise they use a keyword search near the address. Choices in the same group widen the results (Thai OR Indian). Diet choices narrow them where Google has real data (vegetarian).

## Cost note

Keyword-based choices add extra searches. We cap each search at 3 extra keyword searches. If more are picked, the app uses the first 3 and says so.

## Technical details

- `src/lib/filters.ts`: expand the chip lists into three groups (cravings, diet, cuisine) using the same `Chip` shape (`types`, `keyword`, `guess`). Add `MEALS`, a `defaultMealForNow()` helper, and a `FAST_FOOD_CHAINS` name list with an `isFastFood(place)` helper.
- `src/lib/places.functions.ts`:
  - Add `places.servesBreakfast`, `places.servesBrunch`, `places.servesLunch` and `places.servesDinner` to the field mask, and map them onto `Restaurant` as `meals`.
  - Input gets `meal` and `fastFood` ("include" | "exclude" | "only"). "only" sets includedTypes to fast food. "exclude" passes `excludedTypes: ["fast_food_restaurant"]` to nearby search. Breakfast adds `breakfast_restaurant`, `brunch_restaurant`, `cafe` and `bakery` types when no cuisine is chosen.
  - Raise the types limit to 50 and keep keywords capped at 3.
- `src/routes/index.tsx`: add the meal segmented control and the fast food switch, collapsible chip groups with counts and clear, and client-side meal and fast-food filtering. The selected meal and fast-food setting are added to the search key.
- Only Google types that are valid for Places API (New) Table A are used. Unsupported ones become keywords.
