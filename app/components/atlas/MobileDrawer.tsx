"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useDragControls, PanInfo } from "motion/react";
import { X, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export function MobileDrawer({
  isOpen,
  onClose,
  onBack,
  title,
  subtitle,
  badge,
  children,
}: MobileDrawerProps) {
  const [windowHeight, setWindowHeight] = useState(800);
  const [activeState, setActiveState] = useState<"peek" | "expanded">("peek");
  const dragControls = useDragControls();
  const y = useMotionValue(800);

  // Measure window height dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowHeight(window.innerHeight);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const expandedY = windowHeight * 0.06; // Snap fully open at 6% from the top
  const peekY = windowHeight * 0.52; // Snap peek at 52% from the top (~48% height)
  const closedY = windowHeight; // Snap closed when pushed completely off screen

  // Track dragging state to prevent collision between scrolling and layout changes
  const isDragging = useRef(false);

  // Map drawer position to background dimmer opacity
  // Clamp: true ensures opacity is strictly between 0 and 0.45
  const backdropOpacity = useTransform(y, [peekY, expandedY], [0, 0.45], { clamp: true });

  // Only intercept clicks/taps on the backdrop when the drawer is in peek or expanded state
  const backdropPointerEvents = useTransform(y, (latestY) => {
    const midway = (peekY + expandedY) / 2;
    return latestY <= midway ? "auto" : "none";
  });

  const variants = {
    closed: { y: closedY },
    peek: { y: peekY },
    expanded: { y: expandedY },
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    isDragging.current = false;
    const currentY = y.get();
    const velocityY = info.velocity.y;

    if (velocityY > 400) {
      // Swipe down quickly
      if (activeState === "expanded") {
        setActiveState("peek");
      } else {
        onClose();
      }
    } else if (velocityY < -400) {
      // Swipe up quickly
      if (activeState === "peek") {
        setActiveState("expanded");
      }
    } else {
      // Low velocity: snap to the nearest target state
      const dExpanded = Math.abs(currentY - expandedY);
      const dPeek = Math.abs(currentY - peekY);
      const dClosed = Math.abs(currentY - closedY);

      const closest = Math.min(dExpanded, dPeek, dClosed);

      if (closest === dExpanded) {
        setActiveState("expanded");
      } else if (closest === dPeek) {
        setActiveState("peek");
      } else {
        onClose();
      }
    }
  };

  // Reset to peek state whenever drawer is opened/re-opened
  useEffect(() => {
    if (isOpen) {
      setActiveState("peek");
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop Dimmer */}
      <motion.div
        className="md:hidden fixed inset-0 bg-black/40 z-100 backdrop-blur-[2px] mobile-drawer-backdrop"
        style={{
          opacity: backdropOpacity,
          pointerEvents: backdropPointerEvents as any,
        }}
        onClick={() => {
          if (activeState === "expanded") {
            setActiveState("peek");
          } else {
            onClose();
          }
        }}
        initial={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Touch-Enabled Drawer Sheet */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: expandedY, bottom: closedY }}
        dragElastic={{ top: 0.15, bottom: 0.3 }}
        variants={variants}
        initial="closed"
        animate={isOpen ? activeState : "closed"}
        onDragStart={() => {
          isDragging.current = true;
        }}
        onDragEnd={handleDragEnd}
        exit="closed"
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 280,
          mass: 0.8,
        }}
        className="md:hidden fixed inset-x-0 top-0 z-101 flex flex-col border-t border-line bg-paper/96 shadow-[0_-8px_32px_rgba(0,0,0,0.15),0_-1px_4px_rgba(0,0,0,0.05)] backdrop-blur-xl rounded-t-[22px] overflow-hidden select-none mobile-drawer-sheet"
        style={{
          y,
          height: `calc(100vh - ${expandedY}px)`,
          maxHeight: `calc(100dvh - ${expandedY}px)`,
        }}
      >
        {/* Top accent highlight for 3D depth */}
        <div className="absolute top-0 inset-x-0 h-1 bg-white/20 rounded-t-[30px] pointer-events-none z-20" />

        {/* Grab Handle & Navigation Header */}
        <motion.div
          className="shrink-0 flex flex-col pb-3.5 pt-2 bg-paper/98 border-b border-line cursor-grab touch-none select-none relative z-10"
          onPointerDown={(e) => dragControls.start(e)}
          onTap={() => {
            if (!isDragging.current) {
              setActiveState(activeState === "peek" ? "expanded" : "peek");
            }
          }}
        >
          {/* Grab Handle Pill */}
          <div className="w-14 h-1.5 bg-ink/18 hover:bg-ink/28 rounded-full mx-auto mb-2 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />

          {/* Expand/Collapse Indicator visual hook */}
          <div className="flex items-center justify-center gap-1.5 text-muted/65 text-[9px] tracking-[0.11em] uppercase font-ui font-semibold mb-2 animate-pulse select-none">
            {activeState === "peek" ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-gold animate-bounce" />
                <span>Swipe or tap to expand</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-gold" />
                <span>Swipe or tap to collapse</span>
              </>
            )}
          </div>

          {/* Navigation Action Row */}
          <div className="px-5 flex justify-between items-center text-muted text-[10px] tracking-[0.14em] uppercase font-ui font-bold">
            {onBack ? (
              <button
                type="button"
                className="group inline-flex items-center gap-1.5 border-0 bg-transparent text-gold text-[11px] font-bold tracking-[0.08em] uppercase p-0 cursor-pointer transition-colors hover:text-gold/80"
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center border-0 bg-transparent text-muted hover:text-ink w-6 h-6 rounded-full hover:bg-line/20 cursor-pointer transition-all duration-200 absolute top-3 right-3"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close details"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {/* Header Title Information */}
          <div className="px-5 mt-2.5">
            {badge && <div className="mb-1 flex">{badge}</div>}
            <h1 className="m-0 font-medium text-[26px] max-sm:text-[23px] leading-[1.15] font-heading tracking-tight text-ink select-text">
              {title}
            </h1>
            {subtitle && (
              <div className="mt-1.5 pl-3 border-l-2 border-gold/30 select-text">
                <span className="block text-muted italic text-[12.5px] font-body leading-relaxed">
                  {subtitle}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Scrollable Body Content */}
        <div
          className={`flex-1 overflow-y-auto px-5 pt-4 pb-12 custom-scrollbar select-text overscroll-contain ${activeState === "expanded" ? "overflow-y-auto" : "overflow-hidden"
            }`}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
}
