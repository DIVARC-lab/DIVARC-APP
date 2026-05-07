import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-12 w-full appearance-none rounded-xl border border-line bg-white pl-4 pr-10 text-sm text-fg",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-night/15 focus:border-night",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
          aria-hidden
        />
      </div>
    );
  },
);
