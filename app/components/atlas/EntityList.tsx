"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { EntityKind, HistoryEntity } from "../../lib/types";

const KIND_GLYPH: Record<EntityKind, string> = {
  person: "♙",
  event: "✦",
  empire: "⌁",
  place: "◉",
  monument: "▲",
};

const KIND_BG: Record<EntityKind, string> = {
  person: "bg-[#596f60]",
  event: "bg-[#8b5c45]",
  empire: "bg-[#a16b37]",
  place: "bg-[#4f6d62]",
  monument: "bg-[#9a6238]",
};

type EntityListProps = {
  title: string;
  entities: HistoryEntity[];
  emptyHint?: string;
  isLoading?: boolean;
  onSelect?: (entity: HistoryEntity) => void;
};

export function EntityList({ title, entities, emptyHint, isLoading, onSelect }: EntityListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const skeletonClass = "bg-paper-deep bg-gradient-to-r from-paper-deep via-white/45 to-paper-deep animate-shimmer bg-[length:250px_100%] bg-no-repeat";

  if (isLoading) {
    return (
      <section className="mt-4.5">
        <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase font-section">
          <span>{title}</span>
          <span className={`${skeletonClass} w-4.5 h-3 rounded-[2px]`} />
        </div>
        <ul className="list-none m-0 p-0">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <div className="flex items-center gap-3 py-2.5 border-b border-line">
                <span className={`${skeletonClass} w-7 h-7 rounded-full shrink-0`} />
                <span className="flex-1 flex flex-col gap-1.5">
                  <span className={`${skeletonClass} h-3 w-[55%] rounded-[2px]`} />
                  <span className={`${skeletonClass} h-2 w-[85%] rounded-[2px]`} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!isLoading && entities.length === 0) {
    if (!emptyHint) return null;
    return (
      <section className="mt-4.5">
        <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase font-section">
          <span>{title}</span>
          <small className="text-gold text-[9px]">0</small>
        </div>
        <p className="my-2 text-muted/85 font-body text-xs leading-[1.4]">{emptyHint}</p>
      </section>
    );
  }

  const showCollapse = entities.length > 3;
  const displayedEntities = showCollapse && !isExpanded ? entities.slice(0, 3) : entities;

  return (
    <section className="mt-4.5">
      <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase font-section mb-1.5">
        <span>{title}</span>
        <small className="text-gold text-[9px]">{entities.length}</small>
      </div>
      <motion.ul layout className="list-none m-0 p-0">
        <AnimatePresence initial={false}>
          {displayedEntities.map((entity) => {
            const years =
              entity.yearStart && entity.yearEnd
                ? `${entity.yearStart} – ${entity.yearEnd}`
                : entity.yearStart;
            return (
              <motion.li
                key={entity.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-1.5 py-2 border-0 border-b border-line bg-transparent text-left transition-all duration-160 ease hover:bg-paper/70 hover:rounded-theme hover:translate-x-1 hover:translate-y-0! cursor-pointer"
                  onClick={() => onSelect?.(entity)}
                >
                  {entity.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="size-9 object-cover border border-ink/18 rounded-theme shrink-0" src={entity.imageUrl} alt="" />
                  ) : (
                    <span className={`grid place-items-center size-7 rounded-full text-[#f7ecd5] text-[13px] shrink-0 ${KIND_BG[entity.kind]}`}>
                      {KIND_GLYPH[entity.kind]}
                    </span>
                  )}
                  <span className="flex-1 min-w-0 text-ink font-body text-[13px]">
                    {entity.label}
                    <small className="block mt-0.5 text-muted font-ui text-[10px] truncate">
                      {[entity.kind, years, entity.description].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  <ArrowRight className="size-3 text-gold" />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
      {showCollapse && (
        <motion.div layout className="mt-2 flex justify-center w-full">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="group flex items-center gap-1 text-gold hover:text-gold/80 font-ui text-[9px] font-bold tracking-[0.06em] uppercase cursor-pointer transition-colors py-1 bg-transparent! border-0 outline-none shadow-none! p-0 appearance-none border-none!"
          >
            <span>{isExpanded ? "View less" : `View ${entities.length - 3} more`}</span>
          </button>
        </motion.div>
      )}
    </section>
  );
}
