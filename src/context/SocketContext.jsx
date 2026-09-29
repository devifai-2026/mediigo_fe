import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { getAccessToken } from '../lib/api.js';
import { EVENTS } from '../lib/socketEvents.js';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  // The user id, not just isAuthed: signing out and back in as someone else
  // never flips isAuthed to false long enough to tear the socket down, so the
  // connection would keep the PREVIOUS user's token and their joined rooms.
  const { isAuthed, user } = useAuth();
  const userId = user?._id ?? user?.id ?? null;
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  // Rooms are re-joined from here on every reconnect.
  const roomsRef = useRef(new Set());
  const [displayToken, setDisplayToken] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!isAuthed && !displayToken) {
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      auth: displayToken ? { publicStandee: displayToken } : { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Re-join every room we were in. Deltas are never replayed — consumers
      // refetch an authoritative snapshot instead.
      roomsRef.current.forEach((doctorId) => socket.emit(EVENTS.JOIN_CHAMBER, { doctorId }));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
      // Rooms belong to the session that joined them. Carrying them into the
      // next sign-in would re-join another user's chamber.
      roomsRef.current.clear();
    };
  }, [isAuthed, displayToken, userId]);

  const joinChamber = useCallback((doctorId) => {
    if (!doctorId) return;
    roomsRef.current.add(doctorId);
    socketRef.current?.emit(EVENTS.JOIN_CHAMBER, { doctorId });
  }, []);

  const leaveChamber = useCallback((doctorId) => {
    if (!doctorId) return;
    roomsRef.current.delete(doctorId);
    socketRef.current?.emit(EVENTS.LEAVE_CHAMBER, { doctorId });
  }, []);

  const requestSnapshot = useCallback((doctorId, date) => {
    socketRef.current?.emit(EVENTS.REQUEST_QUEUE_SNAPSHOT, { doctorId, date });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, connected, joinChamber, leaveChamber, requestSnapshot, on, setDisplayToken }}
    >
      {children}
    </SocketContext.Provider>
  );
}
