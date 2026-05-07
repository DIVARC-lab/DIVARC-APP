import { Slot, Slottable } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-night text-white hover:bg-night-soft active:bg-night-muted shadow-sm",
  secondary:
    "bg-white text-night border border-night/15 hover:border-night/40 hover:bg-night/5 active:bg-night/10",
  ghost:
    "bg-transparent text-night hover:bg-night/5 active:bg-night/10",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-full gap-1.5",
  md: "h-11 px-5 text-sm rounded-full gap-2",
  lg: "h-12 px-6 text-base rounded-full gap-2",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      asChild,
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {loading && !asChild ? (
          <span
            aria-hidden
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        ) : null}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  },
);
