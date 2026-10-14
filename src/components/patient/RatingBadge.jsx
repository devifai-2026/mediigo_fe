import clsx from 'clsx';

/**
 * A doctor's public rating: "★ 4.6 (23)". A doctor with no approved reviews
 * yet reads "New" rather than "0.0", which looks like a terrible score.
 */
export function RatingBadge({ rating, size = 'sm', className }) {
  const count = rating?.count ?? 0;
  const average = Number(rating?.average ?? 0);
  const big = size === 'lg';

  if (!count) {
    return (
      <span className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 font-semibold',
        big ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
      >
        New
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 font-semibold',
        big ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
      aria-label={`Rated ${average.toFixed(1)} out of 5 by ${count} patients`}
    >
      <svg viewBox="0 0 24 24" className={clsx('text-amber-400', big ? 'w-4 h-4' : 'w-3 h-3')} fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
      </svg>
      {average.toFixed(1)}
      <span className="font-normal text-amber-700/80">({count})</span>
    </span>
  );
}
