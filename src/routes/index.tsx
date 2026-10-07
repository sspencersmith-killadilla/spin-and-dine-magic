import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Star, Dices, Loader2, Navigation, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SlotMachine } from "@/components/SlotMachine";
import { FortuneWheel } from "@/components/FortuneWheel";
import {
  autocompleteAddress,
  geocodeAddress,
  reverseGeocode,
  getPhotoUrl,
  getPlaceLocation,
  searchRestaurants,
  type Restaurant,
} from "@/lib/places.functions";
import {
  ALL_CHIPS,
  CHIP_GROUPS,
  MEALS,
  defaultMealForNow,
  isFastFood,
  milesBetween,
  randomIndex,
  type FastFood,
  type Meal,
} from "@/lib/filters";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Where Am I Eating? — Let Fate Pick Your Restaurant" },
      {
        name: "description",
        content:
          "Enter an address, pick your cravings, and spin a slot machine or wheel of fortune to choose a nearby restaurant.",
      },
      { property: "og:title", content: "Where Am I Eating? — Let Fate Pick Your Restaurant" },
      {
        property: "og:description",
        content: "Spin to pick a restaurant near you. Filter by spicy, vegetarian, price, rating and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Loc = { lat: number; lng: number; address: string };
const PRICE_LABELS = ["$", "$$", "$$$", "$$$$"];
const MAX_WHEEL = 16;

function Index() {
  const autocomplete = useServerFn(autocompleteAddress);
  const placeLoc = useServerFn(getPlaceLocation);
  const geocode = useServerFn(geocodeAddress);
  const revGeocode = useServerFn(reverseGeocode);
  const search = useServerFn(searchRestaurants);
  const photoFn = useServerFn(getPhotoUrl);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; text: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const sessionRef = useRef(crypto.randomUUID());
  const reqId = useRef(0);

  const [loc, setLoc] = useState<Loc | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [radius, setRadius] = useState(5);
  const [meal, setMeal] = useState<Meal>("any");
  const [fastFood, setFastFood] = useState<FastFood>("include");
  useEffect(() => setMeal(defaultMealForNow()), []);

  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"slot" | "wheel">("slot");
  const [spinKey, setSpinKey] = useState(0);
  const [pool, setPool] = useState<Restaurant[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [winnerPhoto, setWinnerPhoto] = useState<string | null>(null);

  // Address autocomplete (debounced)
  useEffect(() => {
    if (!showSug || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const s = await autocomplete({ data: { input: query, sessionToken: sessionRef.current } });
        if (id === reqId.current) setSuggestions(s);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, showSug]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSuggestion = async (s: { placeId: string; text: string }) => {
    setQuery(s.text);
    setShowSug(false);
    setSuggestions([]);
    try {
      const l = await placeLoc({ data: { placeId: s.placeId, sessionToken: sessionRef.current } });
      sessionRef.current = crypto.randomUUID();
      setLoc({ ...l, address: l.address || s.text });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitAddress = async () => {
    if (query.trim().length < 3) return;
    setShowSug(false);
    try {
      setLoc(await geocode({ data: { address: query } }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const useMyLocation = () => {
    if (geoLoading) return;
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location detection.");
      return;
    }
    setError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { address } = await revGeocode({ data: { lat: latitude, lng: longitude } });
          setLoc({ lat: latitude, lng: longitude, address: address || "your location" });
          setQuery(address);
          setShowSug(false);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access was blocked. Allow it in your browser, or type your address instead."
            : "Couldn't determine your location. Try typing your address instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  // Fetch restaurants when location / cuisine / radius changes
  const searchKey = JSON.stringify([loc?.lat, loc?.lng, [...chips].sort(), radius, meal, fastFood]);
  useEffect(() => {
    if (!loc) return;
    const selected = ALL_CHIPS.filter((c) => chips.includes(c.id));
    const types = [...new Set(selected.flatMap((c) => c.types))];
    const keywords = [...new Set(selected.flatMap((c) => (c.keyword ? [c.keyword] : [])))].slice(0, 3);
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { lat: loc.lat, lng: loc.lng, radiusMiles: radius, types, keywords, meal, fastFood } });
        if (!cancelled) {
          setPlaces(r);
          setExcluded(new Set());
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!loc) return [];
    return places
      .map((p) => ({ ...p, distance: milesBetween(loc, p) }))
      .filter((p) => p.distance <= radius)
      .filter((p) => !openNow || p.openNow === true)
      .filter((p) => minRating === 0 || (p.rating ?? 0) >= minRating)
      .filter((p) => prices.length === 0 || (p.priceLevel !== null && prices.includes(p.priceLevel)))
      .filter((p) => !chips.includes("vegetarian") || p.vegetarian === true || p.types.some((t) => t.startsWith("veg")))
      .filter((p) => meal === "any" || p.meals[meal] !== false)
      .filter((p) => (fastFood === "exclude" ? !isFastFood(p) : fastFood === "only" ? isFastFood(p) : true))
      .sort((a, b) => a.distance - b.distance);
  }, [places, loc, radius, openNow, minRating, prices, chips, meal, fastFood]);

  const eligible = filtered.filter((p) => !excluded.has(p.id));

  const spin = () => {
    if (eligible.length === 0 || spinning) return;
    let p = [...eligible];
    if (mode === "wheel" && p.length > MAX_WHEEL) {
      p = p.sort(() => Math.random() - 0.5).slice(0, MAX_WHEEL);
    }
    setPool(p);
    setWinnerIdx(randomIndex(p.length));
    setWinner(null);
    setWinnerPhoto(null);
    setSpinning(true);
    setSpinKey((k) => k + 1);
  };

  const onDone = async () => {
    setSpinning(false);
    if (winnerIdx === null) return;
    const w = pool[winnerIdx] ?? null;
    setWinner(w);
    if (w?.photo) setWinnerPhoto(await photoFn({ data: { name: w.photo } }));
  };

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const names = (pool.length ? pool : eligible.slice(0, MAX_WHEEL)).map((p) => p.name);
  const guessLabels = ALL_CHIPS.filter((c) => c.guess && chips.includes(c.id)).map((c) => c.label);
  const keywordCount = new Set(ALL_CHIPS.filter((c) => c.keyword && chips.includes(c.id)).map((c) => c.keyword)).size;

  return (
    <main className="min-h-screen pb-24">
      <header className="mx-auto max-w-6xl px-4 pt-12 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Indecisive?</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Where Am I <span className="text-primary">Eating?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          The ultimate algorithmic answer to your culinary indecision.
        </p>
      </header>

      <section className="relative mx-auto mt-8 max-w-2xl px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitAddress();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSug(true);
              }}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              placeholder="Enter your address..."
              className="h-12 rounded-xl border bg-card pl-10 text-sm transition-colors focus-visible:border-primary"
            />
            {showSug && suggestions.length > 0 && (
              <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border bg-card shadow-2xl">
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-muted"
                    >
                      {s.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="h-12 rounded-xl px-4 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95"
          >
            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="mr-1 h-4 w-4" />}
            <span className="hidden sm:inline">{geoLoading ? "Locating…" : "My location"}</span>
          </Button>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-6 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95">
            Go
          </Button>
        </form>
        {loc && <p className="mt-2 text-center text-sm text-muted-foreground">Searching near {loc.address}</p>}
      </section>

      <div className="mx-auto mt-10 grid max-w-6xl gap-8 px-4 lg:grid-cols-[320px_1fr]">
        {/* Filters */}
        <aside className="space-y-6 rounded-2xl border bg-card p-5 shadow-2xl">
          <FilterGroup title="Meal">
            <Segmented
              options={MEALS}
              value={meal}
              onChange={(v) => setMeal(v as Meal)}
            />
          </FilterGroup>
          <FilterGroup title="Fast food">
            <Segmented
              options={[
                { id: "include", label: "Include" },
                { id: "exclude", label: "Exclude" },
                { id: "only", label: "Only" },
              ]}
              value={fastFood}
              onChange={(v) => setFastFood(v as FastFood)}
            />
          </FilterGroup>
          {CHIP_GROUPS.map((g) => (
            <ChipGroup
              key={g.id}
              title={g.title}
              chips={g.chips}
              selected={chips}
              defaultOpen={g.id !== "cuisine"}
              onToggle={(id) => setChips(toggle(chips, id))}
              onClear={() => setChips(chips.filter((id) => !g.chips.some((c) => c.id === id)))}
            />
          ))}
          {guessLabels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              * {guessLabels.join(", ")} {guessLabels.length === 1 ? "is a best guess" : "are best guesses"} — Google
              doesn't track {guessLabels.length === 1 ? "it" : "them"}, so we match likely cuisines and keywords.
            </p>
          )}
          {keywordCount > 3 && (
            <p className="text-xs text-muted-foreground">
              To keep searches quick, only the first 3 keyword-based choices are searched.
            </p>
          )}
          <FilterGroup title="Price">
            <div className="flex gap-2">
              {PRICE_LABELS.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setPrices(toggle(prices, i + 1))}
                  className={`flex-1 rounded-full border py-1.5 text-xs font-medium transition ${
                    prices.includes(i + 1)
                      ? "border-primary bg-primary font-bold text-primary-foreground"
                      : "bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title={`Minimum rating: ${minRating === 0 ? "Any" : `${minRating}+ stars`}`}>
            <Slider min={0} max={4.5} step={0.5} value={[minRating]} onValueChange={(v) => setMinRating(v[0] ?? 0)} />
          </FilterGroup>
          <FilterGroup title={`Distance: ${radius} mile${radius === 1 ? "" : "s"}`}>
            <Slider min={1} max={10} step={1} value={[radius]} onValueChange={(v) => setRadius(v[0] ?? 5)} />
          </FilterGroup>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Open now only</span>
            <Switch checked={openNow} onCheckedChange={setOpenNow} />
          </label>
        </aside>

        {/* Picker + results */}
        <section className="min-w-0 space-y-8">
          <div className="rounded-2xl border bg-card p-5 shadow-2xl sm:p-8">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex rounded-lg border bg-background p-1">
                {(["slot", "wheel"] as const).map((m) => (
                  <button
                    key={m}
                    disabled={spinning}
                    onClick={() => {
                      setMode(m);
                      setPool([]);
                      setWinner(null);
                    }}
                    className={`rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                      mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m === "slot" ? "Slot machine" : "Wheel"}
                  </button>
                ))}
              </div>
            </div>

            {eligible.length === 0 ? (
              <div className="marquee flex min-h-[240px] items-center justify-center rounded-xl p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 h-12 w-12 animate-[spin_10s_linear_infinite] rounded-full border-2 border-dashed border-primary" />
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {loading ? "Finding restaurants…" : loc ? "No restaurants match — loosen your filters." : "Awaiting location"}
                  </p>
                </div>
              </div>
            ) : mode === "slot" ? (
              <SlotMachine names={names} winnerIndex={winnerIdx} spinKey={spinKey} onDone={onDone} />
            ) : (
              <FortuneWheel names={names} winnerIndex={winnerIdx} spinKey={spinKey} onDone={onDone} />
            )}

            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                onClick={spin}
                disabled={eligible.length === 0 || spinning}
                size="lg"
                className="ember-glow h-14 rounded-xl px-10 font-display text-lg font-bold uppercase tracking-widest transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
              >
                <Dices className="mr-2 h-5 w-5" />
                {spinning ? "Spinning…" : "Spin the dial"}
              </Button>
              {mode === "wheel" && eligible.length > MAX_WHEEL && (
                <p className="text-xs text-muted-foreground">
                  The wheel uses a random {MAX_WHEEL} of your {eligible.length} matches each spin.
                </p>
              )}
            </div>

            {winner && (
              <div className="relative mt-8 overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-2xl">
                <Confetti />
                {winnerPhoto && <img src={winnerPhoto} alt={winner.name} className="h-56 w-full object-cover" />}
                <div className="p-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tonight you're eating at</p>
                  <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{winner.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{winner.address}</p>
                  <div className="mt-2 flex justify-center gap-4 text-sm text-muted-foreground">
                    {winner.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" /> {winner.rating}
                      </span>
                    )}
                    {winner.priceLevel ? <span>{PRICE_LABELS[winner.priceLevel - 1]}</span> : null}
                    <span>{winner.category}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {winner.mapsUrl && (
                      <Button asChild className="rounded-xl font-bold">
                        <a href={winner.mapsUrl} target="_blank" rel="noreferrer">
                          <Navigation className="mr-1 h-4 w-4" /> Get directions
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" className="rounded-xl" onClick={spin}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Spin again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

          {loc && (
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
                    </span>
                  ) : (
                    `${eligible.length} in the running`
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">Tap a restaurant to take it out of the spin</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {filtered.map((p) => {
                  const out = excluded.has(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          const s = new Set(excluded);
                          if (out) s.delete(p.id);
                          else s.add(p.id);
                          setExcluded(s);
                          setPool([]);
                        }}
                        className={`w-full rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 ${
                          out ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-bold ${out ? "line-through" : ""}`}>{p.name}</span>
                          {out ? <X className="h-4 w-4 shrink-0" /> : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>{p.distance < 0.1 ? "<0.1" : p.distance.toFixed(1)} mi</span>
                          {p.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-primary text-primary" /> {p.rating} ({p.ratingCount})
                            </span>
                          )}
                          {p.priceLevel ? <span>{PRICE_LABELS[p.priceLevel - 1]}</span> : null}
                          <span>{p.category}</span>
                          {p.openNow !== null && (
                            <span className={p.openNow ? "text-success" : "text-destructive"}>
                              {p.openNow ? "Open" : "Closed"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{p.address}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">{title}</h3>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-xl border bg-background p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChipGroup({
  title,
  chips,
  selected,
  defaultOpen,
  onToggle,
  onClear,
}: {
  title: string;
  chips: readonly { id: string; label: string; guess?: boolean }[];
  selected: string[];
  defaultOpen: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = chips.filter((c) => selected.includes(c.id)).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          {title}
          {count > 0 && (
            <span className="rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">{count}</span>
          )}
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {count > 0 && (
          <button onClick={onClear} className="text-[10px] font-bold uppercase text-muted-foreground underline">
            Clear all
          </button>
        )}
      </div>
      {open && <ChipRow chips={[...chips]} selected={selected} onToggle={onToggle} />}
    </div>
  );
}

function ChipRow({
  chips,
  selected,
  onToggle,
}: {
  chips: { id: string; label: string; guess?: boolean }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onToggle(c.id)}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
            selected.includes(c.id)
              ? "border-primary bg-primary font-bold text-primary-foreground"
              : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {c.label}
          {c.guess ? "*" : ""}
        </button>
      ))}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ["var(--primary)", "var(--gold)", "var(--accent)", "var(--foreground)"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
