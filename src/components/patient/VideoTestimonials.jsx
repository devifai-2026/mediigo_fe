import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Modal.jsx';
import { Icon } from '../ui/Icon.jsx';
import { initialsOf } from '../../lib/format.js';

/**
 * Patient video testimonials: a scrolling row of cards that play in a dialog.
 *
 * Plays in place rather than linking out — sending a patient to YouTube mid-way
 * through choosing a doctor is how they end up not booking. YouTube and Vimeo
 * links become embeds; anything else is treated as a direct video file.
 *
 * Item: { id, patientName, condition, quote, url, thumbnailUrl, durationSec, createdAt }
 */

const TINTS = [
  'from-teal-600 to-emerald-400',
  'from-mg-blue to-sky-400',
  'from-indigo-600 to-purple-400',
  'from-rose-500 to-amber-400',
];

const youtubeId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};
const vimeoId = (url) => String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null;

// A YouTube video already has a poster; use it when none was uploaded.
const posterOf = (v) => v.thumbnailUrl || (youtubeId(v.url) ? `https://i.ytimg.com/vi/${youtubeId(v.url)}/hqdefault.jpg` : null);

const clock = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : null);

function Player({ video }) {
  const yt = youtubeId(video.url);
  const vm = vimeoId(video.url);
  if (yt || vm) {
    return (
      <iframe
        title={video.title || `Testimonial by ${video.patientName}`}
        src={yt
          ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`
          : `https://player.vimeo.com/video/${vm}?autoplay=1`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="w-full aspect-video rounded-lg bg-black"
      />
    );
  }
  return (
    <video
      src={video.url}
      poster={posterOf(video) || undefined}
      controls
      autoPlay
      playsInline
      className="w-full aspect-video rounded-lg bg-black"
    />
  );
}

function Card({ video, index, onPlay }) {
  const poster = posterOf(video);
  const [posterFailed, setPosterFailed] = useState(false);
  const duration = clock(video.durationSec);
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group snap-start shrink-0 w-[280px] sm:w-[300px] text-left rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md hover:border-mg-teal/40 transition"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden">
        {poster && !posterFailed ? (
          <img src={poster} alt="" loading="lazy" onError={() => setPosterFailed(true)} className="w-full h-full object-cover" />
        ) : (
          // No poster: a branded tile with the patient's initials, not a black box.
          <div className={clsx('w-full h-full bg-gradient-to-br p-3 flex items-end text-white', TINTS[index % TINTS.length])}>
            <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center text-xs font-bold">
              {initialsOf(video.patientName)}
            </span>
          </div>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/10 transition">
          <span className="w-12 h-12 rounded-full bg-white/95 grid place-items-center shadow-lg group-hover:scale-110 transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-800 ml-0.5" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{duration}</span>
        )}
      </div>
      <p className="mt-3 text-[15px] font-semibold text-slate-900 truncate">{video.patientName}</p>
      {video.condition && (
        <span className="mt-1 inline-block rounded bg-mg-teal/10 px-2 py-0.5 text-xs font-medium text-mg-teal">
          Treated for {video.condition}
        </span>
      )}
      {video.quote && <p className="mt-2 text-sm text-slate-600 line-clamp-2">“{video.quote}”</p>}
    </button>
  );
}

export function VideoTestimonials({ id, doctorName, videos }) {
  const [playing, setPlaying] = useState(null);
  const rowRef = useRef(null);
  if (!videos.length) return null;

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <section id={id} className="scroll-mt-28 py-8 border-t border-slate-200 first:border-t-0 first:pt-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Video Testimonials</h2>
          <p className="mt-1 text-sm text-slate-500">Patients of {doctorName} share their experience</p>
        </div>
        {videos.length > 2 && (
          <div className="hidden sm:flex gap-2">
            <button type="button" aria-label="Previous videos" onClick={() => scroll(-1)} className="w-9 h-9 grid place-items-center rounded-full border border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-teal">
              <Icon name="chevronLeft" className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Next videos" onClick={() => scroll(1)} className="w-9 h-9 grid place-items-center rounded-full border border-slate-200 text-slate-700 hover:border-mg-teal hover:text-mg-teal">
              <Icon name="chevronRight" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div ref={rowRef} className="mt-5 flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {videos.map((v, i) => (
          <Card key={v.id ?? v.url} video={v} index={i} onPlay={() => setPlaying(v)} />
        ))}
      </div>

      <Modal
        open={Boolean(playing)}
        onClose={() => setPlaying(null)}
        title={playing?.patientName}
        subtitle={playing?.condition ? `Treated for ${playing.condition} by ${doctorName}` : `Patient of ${doctorName}`}
        size="xl"
      >
        {playing && (
          <>
            <Player video={playing} />
            {playing.quote && <p className="mt-4 text-[15px] text-slate-700 leading-relaxed">“{playing.quote}”</p>}
          </>
        )}
      </Modal>
    </section>
  );
}
