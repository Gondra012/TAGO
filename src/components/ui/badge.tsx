componentimport type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "ok" | "warn" | "bad" | "band24" | "band5" | "primary";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    muted: "bg-elevated text-muted border-border",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    bad: "bg-bad/15 text-bad border-bad/30",
    band24: "bg-band24/15 text-band24 border-band24/30",
    band5: "bg-band5/15 text-band5 border-band5/30",
    primary: "bg-primary/15 text-primary border-primary/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
