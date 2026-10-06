import { useEffect, useRef, useState } from "react";

const ITEM_H = 72;

export function SlotMachine({
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
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [reel, setReel] = useState<string[]>(names.slice(0, 3));
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (winnerIndex === null || spinKey === 0 || names.length === 0) return;
    const loops = 6;
    const seq: string[] = [];
    for (let l = 0; l < loops; l++) seq.push(...names);
    const target = (loops - 1) * names.length + winnerIndex;
    seq.push(...names.slice(0, 2), ...names.slice(0, 2));
    setReel(seq);
    setAnimate(false);
    setOffset(0);
    const t = setTimeout(() => {
      setAnimate(true);
      setOffset(-(target - 1) * ITEM_H);
    }, 50);
    const d = setTimeout(() => doneRef.current(), 4300);
    return () => {
      clearTimeout(t);
      clearTimeout(d);
    };
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="marquee rounded-xl p-4">
      <div className="relative overflow-hidden rounded-lg bg-background" style={{ height: ITEM_H * 3 }}>
        <div
          style={{
            transform: `translateY(${offset}px)`,
            transition: animate ? "transform 4.2s cubic-bezier(0.12, 0.8, 0.18, 1.02)" : "none",
          }}
        >
          {reel.map((n, i) => (
            <div
              key={i}
              className="flex items-center justify-center px-4 text-center font-display text-2xl font-bold tracking-tight text-foreground"
              style={{ height: ITEM_H }}
            >
              <span className="w-full truncate">{n}</span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[72px] bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72px] bg-gradient-to-t from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-2 top-[72px] h-[72px] rounded-lg border-2 border-primary shadow-[0_0_16px_oklch(0.68_0.19_45/30%)]" />
      </div>
    </div>
  );
}
