import { cn } from "@/lib/cn";
import { useId, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** A labeled input with its error text wired up by id — one component, not three assembled by hand each time. */
export function Field({ label, error, hint, id, className, ...props }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-10 rounded-md border border-rule bg-surface px-3 text-sm text-ink placeholder:text-ink-soft/50",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
          error && "border-danger",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
