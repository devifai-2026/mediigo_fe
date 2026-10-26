import clsx from 'clsx';
import { dictationSupported } from './dictation.js';

/**
 * The mic control above the pad. Idle, it is one wide button the doctor can
 * hit without looking; listening, it shows what is being heard and how to say
 * things, so the first use needs no training.
 */
export function DictationBar({ listening, interim, lastHeard, error, onStart, onStop }) {
  if (!dictationSupported) {
    return (
      <p className="text-[11px] text-slate-400">
        <i className="fa-solid fa-microphone-slash mr-1" aria-hidden="true" />
        Voice input needs Chrome, Edge or Safari.
      </p>
    );
  }

  if (!listening) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-mg-teal bg-teal-50/60 hover:bg-teal-50 text-mg-teal text-sm font-medium transition"
        >
          <i className="fa-solid fa-microphone" aria-hidden="true" />
          Speak the prescription
          <span className="hidden sm:inline text-[11px] font-normal text-slate-500">— medicines, diagnosis, advice</span>
        </button>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-rose-500" />
          </span>
          Listening…
        </span>
        <button
          type="button"
          onClick={onStop}
          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition"
        >
          <i className="fa-solid fa-stop text-[10px] mr-1" aria-hidden="true" />Done
        </button>
      </div>
      <p className={clsx('min-h-[1.25rem] text-sm', interim ? 'text-slate-800 italic' : 'text-slate-400')}>
        {interim || (lastHeard ? <>Added: <span className="not-italic text-slate-600">“{lastHeard}”</span></> : 'Say a medicine…')}
      </p>
      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
        <li><strong className="font-medium text-slate-600">“Dolo 650, one zero one, five days, after food”</strong></li>
        <li>Pause or say <strong className="font-medium text-slate-600">“next”</strong> between medicines</li>
        <li><strong className="font-medium text-slate-600">“Diagnosis viral fever”</strong> · <strong className="font-medium text-slate-600">“Advice …”</strong></li>
        <li><strong className="font-medium text-slate-600">“Undo”</strong> removes the last medicine</li>
      </ul>
    </div>
  );
}
