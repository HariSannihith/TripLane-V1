import useCountdown from '../../hooks/useCountdown';
import { formatDateRange, formatMoney, nightsBetween } from '../../utils/format';
import { placesApi } from '../../api/endpoints';

function Unit({ value, label }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center backdrop-blur-sm sm:px-4">
      <p className="text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">{label}</p>
    </div>
  );
}

/** Hero banner for a finalised trip: the winner, its details, and a live timer. */
export default function Countdown({ group, suggestion }) {
  const countdown = useCountdown(group.startDate);
  const photo = placesApi.photoUrl(suggestion?.photoRef, 1200);
  const nights = nightsBetween(group.startDate, group.endDate);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-indigo-900 shadow-lift">
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="lazy"
        />
      )}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

      <div className="relative p-6 sm:p-8">
        <span className="chip bg-white/15 text-white">🎉 The group decided</span>

        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
          {suggestion?.name || 'Your trip'}
        </h2>
        {suggestion?.address && <p className="mt-1 text-sm text-brand-100">{suggestion.address}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-brand-100">
          <span>📅 {formatDateRange(group.startDate, group.endDate)}</span>
          {nights !== null && <span>🌙 {nights} nights</span>}
          {suggestion && <span>💰 {formatMoney(suggestion.totalCost, group.currency)} per person</span>}
        </div>

        <div className="mt-7">
          {!group.startDate ? (
            <p className="text-sm text-brand-100">
              Add travel dates to the trip and the countdown will start ticking.
            </p>
          ) : countdown?.isPast ? (
            <p className="text-lg font-semibold text-white">
              {nights !== null && new Date(group.endDate) >= new Date()
                ? '✈️ The trip is underway — have a great time!'
                : '🏡 This trip has wrapped up. Time to plan the next one?'}
            </p>
          ) : (
            <>
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-white/70">Departure in</p>
              <div className="grid max-w-md grid-cols-4 gap-2 sm:gap-3">
                <Unit value={countdown.days} label="days" />
                <Unit value={countdown.hours} label="hours" />
                <Unit value={countdown.minutes} label="mins" />
                <Unit value={countdown.seconds} label="secs" />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
