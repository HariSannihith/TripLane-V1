import { initials } from '../../utils/format';

const COLORS = {
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  teal: 'bg-teal-100 text-teal-700',
};

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };

export default function Avatar({ user, size = 'sm', className = '' }) {
  const tone = COLORS[user?.avatarColor] || COLORS.sky;
  return (
    <span
      title={user?.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white ${tone} ${SIZES[size]} ${className}`}
    >
      {initials(user?.name || '?') || '?'}
    </span>
  );
}
