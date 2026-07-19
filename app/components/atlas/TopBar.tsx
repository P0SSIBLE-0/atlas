"use client";

import Image from "next/image";
import type { Theme } from "../../lib/types";

type TopBarProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onHome: () => void;
  depth: "world" | "country" | "place";
  label?: string;
};

export function TopBar({ theme, onThemeChange, onHome, depth, label }: TopBarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 max-w-[360px] md:max-w-3xl mx-auto my-2 rounded-full h-(--topbar-h) px-2 md:px-5 flex items-center justify-between gap-4 border-b border-line bg-linear-to-b from-paper/47 to-paper/35 backdrop-blur-md">
      <button className="flex items-center gap-2 px-2 text-ink border-0 bg-transparent tracking-[0.22em] font-bold text-sm md:text-lg font-logo shrink-0 cursor-pointer" onClick={onHome} aria-label="Return to world map">
        <span className="relative w-7 h-7 shrink-0 overflow-hidden">
          <Image src="/logo.png" alt="Atlas logo" fill className="object-contain scale-125" priority />
        </span>
        <span className="flex items-baseline gap-2">
          <span>ATLAS</span>
          <em className="text-muted font-ui font-semibold text-[9px] tracking-[0.16em] uppercase not-italic max-sm:hidden">HISTORY, PLACED</em>
        </span>
      </button>

      <div className="flex items-center justify-center gap-2 min-w-0 text-muted text-[10px] tracking-[0.08em] uppercase max-md:hidden font-ui" aria-live="polite">
        <button type="button" className={`border-0 bg-transparent px-1.5 py-1 font-inherit uppercase cursor-pointer ${depth === "world" ? "text-ink font-bold" : "text-muted"}`} onClick={onHome}>
          World
        </button>
        {depth !== "world" && label ? (
          <>
            <span className="opacity-50">/</span>
            <span className={`uppercase px-1.5 py-1 ${depth === "country" ? "text-ink font-bold" : "text-muted"}`}>{label}</span>
          </>
        ) : null}
        {depth === "place" ? (
          <>
            <span className="opacity-50">/</span>
            <span className="text-ink font-bold px-2 py-1">Place</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3.5 shrink-0">
        <label className="flex gap-2 items-center text-muted text-[11px] uppercase tracking-[0.12em] font-ui">
          <span className="max-sm:hidden">Look</span>
          <select
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as Theme)}
            aria-label="Map appearance"
            className="border-0 text-ink bg-transparent text-xs font-bold outline-none cursor-pointer font-ui"
          >
            <option value="vintage">Vintage</option>
            <option value="minimal">Minimal</option>
            <option value="modern">Modern</option>
          </select>
        </label>
        {/* {depth !== "world" ? (
          <button className="border border-ink rounded-full! py-1.5 px-2 bg-ink text-paper text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity flex items-center font-ui" type="button" onClick={onHome}>
            Zoom out <span className="ml-2 text-gold">↖</span>
          </button>
        ) : null} */}
      </div>
    </header>
  );
}
