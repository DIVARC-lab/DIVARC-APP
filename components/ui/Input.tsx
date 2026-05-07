import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-12 w-full rounded-xl border bg-white px-4 text-fg placeholder:text-muted",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg",
          invalid
            ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
            : "border-line focus:border-night focus:ring-night/15",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalid?: boolean;
  };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-fg placeholder:text-muted resize-y",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg",
          invalid
            ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
            : "border-line focus:border-night focus:ring-night/15",
          className,
        )}
        {...props}
      />
    );
  },
);
