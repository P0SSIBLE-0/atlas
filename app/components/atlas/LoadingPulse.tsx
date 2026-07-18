"use client";

export function LoadingPulse({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4.5 text-muted italic text-[13px] font-body" role="status" aria-live="polite">
      <span className="size-4 rounded-full border-2 border-gold/35 border-t-gold animate-spin" />
      <p>{label}</p>
    </div>
  );
}
