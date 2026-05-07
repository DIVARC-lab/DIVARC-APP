import * as React from "react";
import { cn } from "@/lib/utils/cn";

type FieldRootProps = React.HTMLAttributes<HTMLDivElement>;

export function Field({ className, ...props }: FieldRootProps) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function FieldLabel({
  className,
  children,
  required,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-night",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-red-500">
          *
        </span>
      ) : null}
    </label>
  );
}

type FieldHintProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FieldHint({ className, ...props }: FieldHintProps) {
  return (
    <p className={cn("text-xs text-muted leading-snug", className)} {...props} />
  );
}

type FieldErrorProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FieldError({ className, children, ...props }: FieldErrorProps) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "text-xs text-red-600 leading-snug flex items-center gap-1",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
