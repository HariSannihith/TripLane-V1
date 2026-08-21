import { useId } from 'react';

/** Labelled input with inline validation messaging and hint text. */
export default function Input({
  label,
  error,
  hint,
  className = '',
  as = 'input',
  children,
  id: providedId,
  ...props
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Element = as;

  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <Element
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`field ${error ? 'field-error' : ''} ${as === 'textarea' ? 'min-h-[88px] resize-y' : ''}`}
        {...props}
      >
        {children}
      </Element>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
