const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`chip ${TONES[tone]} ${className}`}>{children}</span>;
}
