"use client";

export function ShimmerBlock({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} />;
}

export function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-[#4a6a8a]">
      <div className="spin w-7 h-7 border-2 border-[#1a2d45] border-t-[#f5a623] rounded-full" />
      <p className="text-xs tracking-widest uppercase font-medium">Loading…</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-[#4a6a8a] italic py-6">{message}</p>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-[0.22em] text-[#4a6a8a] uppercase mb-4">
      {children}
    </p>
  );
}
