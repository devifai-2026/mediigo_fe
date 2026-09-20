import { useState, useEffect } from 'react';

/**
 * Ticks down to a server-provided instant.
 *
 * Deliberately reports `overdue` rather than firing a completion callback: a
 * break that auto-ended would resume the queue for a doctor who is still in
 * surgery. Only an explicit action clears it.
 */
export const useCountdown = (until) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!until) return { remainingMs: 0, minutes: 0, seconds: 0, overdue: false, label: '' };

  const remainingMs = new Date(until).getTime() - now;
  const overdue = remainingMs <= 0;
  const abs = Math.abs(remainingMs);
  const minutes = Math.floor(abs / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);

  return {
    remainingMs,
    minutes,
    seconds,
    overdue,
    label: `${overdue ? '+' : ''}${minutes}:${String(seconds).padStart(2, '0')}`,
  };
};
