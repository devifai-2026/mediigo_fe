import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

/**
 * Subscribe to a socket event with automatic cleanup. The handler is held in a
 * ref so a component can pass an inline arrow without resubscribing on every
 * render.
 */
export const useSocketEvent = (event, handler, deps = []) => {
  const { socket } = useSocket();
  const saved = useRef(handler);

  useEffect(() => { saved.current = handler; });

  useEffect(() => {
    if (!socket || !event) return undefined;
    const fn = (...args) => saved.current?.(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, ...deps]);
};
