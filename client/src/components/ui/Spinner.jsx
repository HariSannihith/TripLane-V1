export default function Spinner({ className = 'h-6 w-6', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <span className={`animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 ${className}`} />
    </span>
  );
}
