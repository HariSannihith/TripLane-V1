import { useEffect, useMemo, useState } from 'react';

function breakdown(msRemaining) {
  const total = Math.max(msRemaining, 0);
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
    totalMs: total,
    isPast: msRemaining <= 0,
  };
}

/**
 * Live countdown to a target date. Ticks once per second and stops on its own
 * when the target passes, so a departed trip does not keep re-rendering.
 */
export default function useCountdown(targetDate) {
  const target = useMemo(() => {
    if (!targetDate) return null;
    const date = new Date(targetDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [targetDate]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    if (target.getTime() - Date.now() <= 0) return undefined;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  return breakdown(target.getTime() - now);
}
