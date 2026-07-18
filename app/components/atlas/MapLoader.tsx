"use client";

import { motion } from "motion/react";
import { Compass } from "lucide-react";

export function MapLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="fixed inset-0 z-200 bg-paper-deep flex flex-col items-center justify-center text-ink select-none pointer-events-auto"
    >
      {/* Centered Glassmorphic Loading Card */}
      <div className="flex flex-col items-center p-8 bg-paper/70 border border-line backdrop-blur-md rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.12)] max-w-xs w-full text-center">
        {/* Animated Double-Ring Compass Spinner */}
        <div className="relative w-18 h-18 mb-5 flex items-center justify-center">
          {/* Inner Rotating Compass Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="text-gold"
          >
            <Compass className="w-10 h-10" />
          </motion.div>

          {/* Outer Pulsing Glow */}
          <span className="absolute inset-0 rounded-full border border-gold/20 animate-ping" />
          {/* Outer Rotating Dashed Ring */}
          <span className="absolute -inset-1.5 rounded-full border border-dashed border-gold/45 animate-[spin_10s_linear_infinite]" />
        </div>

        {/* Title & Subtitle styled to match theme branding */}
        <h2 className="m-0 text-2xl font-bold font-heading tracking-wide mb-1.5">
          Atlas Explorer
        </h2>
        <p className="m-0 text-muted text-xs tracking-wider uppercase font-ui font-bold mb-5">
          Loading History Map
        </p>

        {/* Action Description Indicator */}
        <div className="flex items-center gap-2 text-ink/75 text-[11px] font-body">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
          <span>Drawing borders...</span>
        </div>
      </div>
    </motion.div>
  );
}
