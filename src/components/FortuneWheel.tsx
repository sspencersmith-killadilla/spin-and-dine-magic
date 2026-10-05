import { useEffect, useRef, useState } from "react";

const SLICE_COLORS = ["var(--primary)", "var(--gold)", "var(--secondary)", "var(--accent)"];

export function FortuneWheel({
  names,
  winnerIndex,
  spinKey,
  onDone,
}: {
  names: string[];
  winnerIndex: number | null;
  spinKey: number;
  onDone: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const n = Math.max(names.length, 1);
  const slice = 360 / n;

  useEffect(() => {
    if (winnerIndex === null || spinKey === 0) return;
    // slice i center is at angle i*slice + slice/2 (clockwise from top). Bring it to top.
    const jitter = (Math.random() - 0.5) * slice * 0.6;
    const targetMod = (360 - (winnerIndex * slice + slice / 2) + jitter + 360) % 360;
    setRotation((r) => {
      const base = r - (r % 360) + 360 * 6;
      return base + targetMod;
    });
    const d = setTimeout(() => doneRef.current(), 5100);
    return () => clearTimeout(d);
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const R = 150;
  const arc = (i: number) => {
    const a0 = ((i * slice - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
    const large = slice > 180 ? 1 : 0;
    return `M0,0 L${R * Math.cos(a0)},${R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${R * Math.cos(a1)},${R * Math.sin(a1)} Z`;
  };

  return (
    <div className="marquee relative mx-auto aspect-square w-full max-w-[380px] rounded-full p-3">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
        <div className="h-0 w-0 border-x-[14px] border-t-[28px] border-x-transparent border-t-foreground drop-shadow" />
      </div>
      <svg
        viewBox="-155 -155 310 310"
        className="h-full w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 5s cubic-bezier(0.15, 0.85, 0.2, 1)",
        }}
      >
        <circle r="154" fill="var(--foreground)" />
        {names.map((name, i) => {
          const mid = i * slice + slice / 2;
          const label = name.length > 16 ? name.slice(0, 15) + "…" : name;
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          const dark = i % SLICE_COLORS.length === 0;
          return (
            <g key={i}>
              <path d={arc(i)} fill={color} stroke="var(--foreground)" strokeWidth="1.5" />
              <text
                transform={`rotate(${mid - 90}) translate(${R - 10},0)`}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={n > 12 ? 9 : 11}
                fontWeight={700}
                fill={dark ? "var(--primary-foreground)" : "var(--foreground)"}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle r="18" fill="var(--gold)" stroke="var(--foreground)" strokeWidth="3" />
      </svg>
    </div>
  );
}
