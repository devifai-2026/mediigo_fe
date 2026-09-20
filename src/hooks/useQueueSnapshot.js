import { useState, useEffect, useCallback, useRef } from 'react';
import { api, unwrap } from '../lib/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useSocketEvent } from './useSocketEvent.js';
import { EVENTS } from '../lib/socketEvents.js';

/**
 * Authoritative queue state for one doctor.
 *
 * MongoDB is the source of truth; sockets are an optimisation. The server sends
 * whole snapshots rather than deltas, and we track a monotonic `version` so a
 * snapshot that arrives out of order can be ignored rather than moving the
 * board backwards. On connect AND on every reconnect we refetch over REST
 * instead of trusting anything the socket may have buffered.
 */
export const useQueueSnapshot = (doctorId, { date } = {}) => {
  const { joinChamber, leaveChamber, connected } = useSocket();
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | live | stale | error
  const [error, setError] = useState(null);
  const versionRef = useRef(-1);

  const fetchSnapshot = useCallback(async () => {
    if (!doctorId) return null;
    setStatus((s) => (s === 'live' ? 'live' : 'loading'));
    try {
      const value = unwrap(await api.get(`/api/queue/${doctorId}${date ? `?date=${date}` : ''}`));
      versionRef.current = value?.version ?? 0;
      setSnapshot(value);
      setStatus('live');
      setError(null);
      return value;
    } catch (e) {
      setError(e);
      setStatus('error');
      return null;
    }
  }, [doctorId, date]);

  useEffect(() => {
    if (!doctorId) return undefined;
    fetchSnapshot();
    joinChamber(doctorId);
    return () => leaveChamber(doctorId);
  }, [doctorId, fetchSnapshot, joinChamber, leaveChamber]);

  // A reconnect always refetches. Replayed socket state can be stale and would
  // lose to the database.
  useEffect(() => {
    if (connected && doctorId) fetchSnapshot();
    if (!connected && snapshot) setStatus('stale');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useSocketEvent(EVENTS.QUEUE_SNAPSHOT, (incoming) => {
    if (!incoming || String(incoming.doctorId) !== String(doctorId)) return;
    // Ignore an older snapshot that overtook a newer one in flight.
    if (incoming.version != null && incoming.version < versionRef.current) return;
    versionRef.current = incoming.version ?? versionRef.current;
    setSnapshot(incoming);
    setStatus('live');
  }, [doctorId]);

  return { snapshot, status, error, refetch: fetchSnapshot, isLive: status === 'live' && connected };
};
