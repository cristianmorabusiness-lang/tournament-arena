import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Labelled input with helper text and inline error (a11y-friendly). */
export function Field({ label, name, error, hint, className = "", ...props }: Props) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {props.required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={`h-11 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
