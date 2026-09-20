import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, unwrap } from '../../lib/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { useAudioUnlock } from '../../hooks/useAudioUnlock.js';
import { announce } from '../../lib/audio.js';
import { EVENTS } from '../../lib/socketEvents.js';
import { Logo } from '../../components/ui/Icon.jsx';
import { token } from '../../lib/format.js';

/**
 * Waiting-room display. Unauthenticated by design — a TV cannot hold a session
 * that expires overnight, so it authenticates with the signed standee
 * credential returned by the public QR scan endpoint.
 */
export default function DisplayView() {
  const { serialId } = useParams();
  const { setDisplayToken } = useSocket();
  const { ready: audioReady, unlock } = useAudioUnlock({ auto: false });
  const [clinic, setClinic] = useState(null);
  const [boards, setBoards] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = unwrap(await api.get(`/api/standees/scan/${serialId}`));
        setClinic(data);
        setDisplayToken(data.displayToken);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [serialId, setDisplayToken]);

  useSocketEvent(EVENTS.QUEUE_SNAPSHOT, (s) => {
    setBoards((b) => ({ ...b, [s.doctorId]: s }));
  });

  useSocketEvent(EVENTS.EXECUTE_AUDIO_ANNOUNCEMENT, (p) => {
    announce({ announcementId: p.announcementId, text: p.text?.en, lang: p.lang });
  });

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-white p-8 text-center">
        <div>
          <Logo className="w-16 h-16 mx-auto mb-4" rounded="rounded-2xl" />
          <h1 className="text-2xl font-black">{error}</h1>
        </div>
      </div>
    );
  }

  if (!clinic) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* A waiting-room screen must never be silently mute. */}
      {!audioReady && (
        <button
          type="button"
          onClick={unlock}
          className="fixed inset-0 z-50 bg-slate-950/95 grid place-items-center text-center p-8"
        >
          <div>
            <Logo className="w-20 h-20 mx-auto mb-6" rounded="rounded-3xl" />
            <h2 className="text-3xl font-black">Tap anywhere to enable announcements</h2>
            <p className="text-slate-400 mt-2">The display cannot call patients aloud until you do.</p>
          </div>
        </button>
      )}

      <header className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Logo className="w-12 h-12" rounded="rounded-2xl" />
          <div>
            <h1 className="text-2xl font-black">{clinic.hospital.name}</h1>
            <p className="text-sm text-slate-400">{clinic.hospital.address?.line1}</p>
          </div>
        </div>
        <span className="text-teal-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" /> Live
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {clinic.doctors.map((d) => {
          const b = boards[d._id];
          const onBreak = b?.session?.isOnBreak ?? d.session?.isOnBreak;
          return (
            <div key={d._id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <p className="text-sm text-slate-400">{d.specialty}</p>
              <h2 className="text-xl font-bold">{d.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Chamber {d.chamberNumber || '—'}</p>

              {onBreak ? (
                <div className="mt-6 text-center py-6">
                  <p className="text-5xl font-black text-amber-400">—</p>
                  <p className="text-amber-300 font-bold mt-2 uppercase text-sm tracking-wider">On break</p>
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Now serving</p>
                  <p className="text-7xl font-black text-teal-400 tabular-nums">{token(b?.currentToken ?? 0)}</p>
                  <p className="text-sm text-slate-400 mt-2">{b?.counts?.waiting ?? 0} waiting</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
