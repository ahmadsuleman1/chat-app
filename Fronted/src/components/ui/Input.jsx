import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, prefix, suffix, className = '', id, ...props },
  ref
) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 flex items-center gap-2 text-[15px] font-medium text-ink">
            {prefix}
            <span className="h-4 w-px bg-line" aria-hidden="true" />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`h-12 w-full rounded-xl border bg-surface-card text-[15px] text-ink placeholder:text-ink-faint
            transition-colors duration-150
            focus:outline-none focus:border-brand-500 focus:shadow-ring
            disabled:bg-surface-sunken disabled:text-ink-faint
            ${prefix ? 'pl-14' : 'pl-3.5'} ${suffix ? 'pr-10' : 'pr-3.5'}
            ${error ? 'border-danger focus:border-danger' : 'border-line'}
            ${className}`}
          {...props}
        />
        {suffix && <span className="absolute right-3 flex items-center">{suffix}</span>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
