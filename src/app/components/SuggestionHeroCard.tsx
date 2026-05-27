import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "./ui/utils";

interface SuggestionHeroCardProps {
  eyebrow: string;
  title: string;
  description: string;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function SuggestionHeroCard({
  eyebrow,
  title,
  description,
  onClick,
  trailing,
  className,
  compact = false,
}: SuggestionHeroCardProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
      <Wrapper
        {...(onClick ? { onClick, type: "button" as const } : {})}
        className={cn(
        "relative w-full overflow-hidden rounded-[30px] text-left transition-transform active:scale-[0.985]",
        compact ? "px-4 py-3" : "px-4 py-3.5 sm:px-5 sm:py-4",
        "bg-[#F8FAFC] border border-[#E5E7EB]",
        "shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-[#EEF2F7]/80" />

      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium uppercase tracking-[0.2em] text-[#6B7280]",
              compact ? "mb-1 text-[9px]" : "mb-1.5 text-[9px] sm:text-[10px]",
            )}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {eyebrow}
          </p>
          <h3
            className={cn(
              "font-light leading-[0.98] text-[#111827]",
              compact ? "max-w-[10ch] text-[1.25rem]" : "max-w-[10ch] text-[1.9rem] sm:max-w-[11ch] sm:text-[2.15rem]",
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {title}
          </h3>
          <p
            className={cn(
              "leading-relaxed text-[#4B5563]",
              compact ? "mt-1 max-w-[23ch] text-[11px]" : "mt-1.5 max-w-[22ch] text-[13px] sm:mt-2 sm:max-w-[24ch] sm:text-sm",
            )}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {description}
          </p>
        </div>

        {trailing ?? (
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]",
            compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11",
          )}>
            <ArrowRight className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
