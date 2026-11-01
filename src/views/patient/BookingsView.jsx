import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { api } from '../../lib/api.js';
import { FilterPills } from '../../components/ui/FilterPills.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { token, relativeDay, time12 } from '../../lib/format.js';
import { TOKEN_STATUS, VISIT_LABEL } from '../../lib/constants.js';
import { Icon } from '../../components/ui/Icon.jsx';
import { RescheduleBanner } from '../../components/patient/RescheduleBanner.jsx';
import { BookingPass } from '../../components/patient/BookingPass.jsx';
import { RatingDialog } from '../../components/patient/RatingDialog.jsx';
import { FollowUpPrompt } from '../../components/patient/FollowUpPrompt.jsx';
import { useNoIndex } from '../../lib/seo.js';
import { asList } from '../../lib/list.js';

/**
 * The bookings list the prototype declared but never implemented — its
 * #bookings-list container had no renderer at all, and activeBooking was a
 * single object rather than a history.
 */
export default function BookingsView() {
  useNoIndex('My bookings');
  const { data: tokens, loading, refetch } = useApi('/api/patients/me/tokens');
  const [tab, setTab] = useState('upcoming');
  // Narrowing by who the visit is for, and by doctor. 'all' = no filter.
  const [person, setPerson] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [pass, setPass] = useState(null);
  const [rating, setRating] = useState(null);
  const { data: myReviews, refetch: refetchReviews } = useApi('/api/reviews/mine');
  const reviewByToken = useMemo(
    () => new Map((asList(myReviews)).map((r) => [r.tokenId, r])),
    [myReviews],
  );
  // Ask once per consultation, and only for the most recent unrated one:
  // opening a stack of dialogs for a patient with six old visits would be
  // nagging, not prompting. Dismissing it is remembered for the session.
  const [dismissed, setDismissed] = useState(() => new Set());
  const toast = useToast();
  const confirm = useConfirm();

  const groups = useMemo(() => {
    const all = asList(tokens);
    return {
      // RESCHEDULE_NEEDED sits in Upcoming: the booking is still alive and
      // needs the patient to act, which they will not do if it is filed away.
      // A follow-up waiting on the patient's answer leads the list: it is the
      // only booking here that the clinic may take away if they say nothing.
      upcoming: all
        .filter((t) => [TOKEN_STATUS.WAITING, TOKEN_STATUS.IN_CHAMBER, 'RESCHEDULE_NEEDED'].includes(t.status))
        .sort((a, b) => Number(b.followUp?.status === 'PENDING') - Number(a.followUp?.status === 'PENDING')),
      completed: all.filter((t) => t.status === TOKEN_STATUS.COMPLETED),
      cancelled: all.filter((t) => [TOKEN_STATUS.SKIPPED, 'CANCELLED'].includes(t.status)),
    };
  }, [tokens]);

  const cancel = async (t) => {
    const okToCancel = await confirm({
      title: 'Cancel this token?',
      message: `Token ${token(t.tokenNumber)} with ${t.doctorId?.name} will be released, and you would need to book again.`,
      // Said before they confirm, not after. A paid token can still be
      // cancelled — it simply is not refunded, and burying that until the
      // money is gone is how a cancellation becomes a complaint.
      detail: t.isPaid
        ? 'This token is already paid for. Cancelling does NOT refund the consultation fee.'
        : 'Cancelled bookings are not refunded.',
      confirmLabel: 'Cancel token',
      cancelLabel: 'Keep token',
      danger: true,
    });
    if (!okToCancel) return;
    try {
      await api.delete(`/api/queue/tokens/${t._id}`);
      toast.success('Token cancelled');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    }
  };

  /**
   * Prompt for a rating when a consultation has just finished.
   *
   * Only the newest unrated visit, and only once: a patient returning after
   * six unrated visits should be asked about the last one, not ambushed with
   * a queue of dialogs. Waits for the reviews list so an already-rated visit
   * never prompts.
   */
  useEffect(() => {
    if (!tokens || !myReviews || rating) return;
    const candidate = (asList(tokens))
      .filter((t) => t.status === TOKEN_STATUS.COMPLETED)
      .filter((t) => !reviewByToken.has(t._id) && !dismissed.has(t._id))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (candidate) setRating(candidate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, myReviews]);

  if (loading) return <SkeletonRows rows={4} />;

  const pendingFollowUps = groups.upcoming.filter((t) => t.followUp?.status === 'PENDING').length;

  // Everyone and every doctor that appears in this account's bookings, for
  // the filter chips — counted on the tab being viewed.
  const personOf = (t) => t.patientSnapshot?.name || 'You';
  const doctorOf = (t) => String(t.doctorId?._id ?? t.doctorId ?? '');
  const people = [...new Set((asList(tokens)).map(personOf))];
  const doctors = [...new Map((asList(tokens)).map((t) => [doctorOf(t), t.doctorId?.name || 'Doctor'])).entries()];

  const rows = groups[tab]
    .filter((t) => person === 'all' || personOf(t) === person)
    .filter((t) => doctorFilter === 'all' || doctorOf(t) === doctorFilter);

  // Grouped by day: soonest first for upcoming, newest first for the past.
  const asc = tab === 'upcoming';
  const sorted = [...rows].sort((x, y) => {
    const d = String(x.date).localeCompare(String(y.date));
    if (d) return asc ? d : -d;
    const t = String(x.startTime || '').localeCompare(String(y.startTime || ''));
    return t || (x.tokenNumber - y.tokenNumber);
  });
  const byDay = sorted.reduce((acc, t) => {
    const last = acc[acc.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else acc.push({ date: t.date, items: [t] });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mg-title">My Bookings</h2>
          <p className="text-xs text-slate-500 mt-1">Every token booked from this account — yours and your family's</p>
        </div>
        <Link to="/p/explore" className="text-xs font-semibold text-mg-teal hover:underline">+ Book a new token</Link>
      </div>

      {pendingFollowUps > 0 && tab !== 'upcoming' && (
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className="w-full text-left rounded-lg border border-mg-teal/40 bg-teal-50/60 px-3 py-2.5 text-xs text-slate-800 flex items-center justify-between gap-2"
        >
          <span>
            <strong>{pendingFollowUps} follow-up{pendingFollowUps === 1 ? '' : 's'}</strong> booked by your doctor need{pendingFollowUps === 1 ? 's' : ''} your reply
          </span>
          <Icon name="chevronRight" className="w-4 h-4 text-mg-teal shrink-0" />
        </button>
      )}

      <div className="space-y-3">
        <FilterPills
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
            { value: 'completed', label: 'Completed', count: groups.completed.length },
            { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
          ]}
        />

        {(people.length > 1 || doctors.length > 1) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {people.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Filter by patient">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-0.5">Patient</span>
                {['all', ...people].map((p) => {
                  const n = p === 'all' ? groups[tab].length : groups[tab].filter((t) => personOf(t) === p).length;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPerson(p)}
                      aria-pressed={person === p}
                      className={clsx(
                        'shrink-0 h-8 pl-1 pr-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 transition',
                        person === p ? 'bg-mg-navy border-mg-navy text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
                      )}
                    >
                      <span className={clsx('w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold', person === p ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>
                        {p === 'all' ? <Icon name="users" className="w-3.5 h-3.5" /> : initials(p)}
                      </span>
                      {p === 'all' ? 'Everyone' : p}
                      <span className={clsx('text-[10px]', person === p ? 'text-white/70' : 'text-slate-400')}>{n}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {doctors.length > 1 && (
              <label className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-slate-500">Doctor</span>
                <select
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                  className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-mg-teal"
                >
                  <option value="all">All doctors</option>
                  {doctors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="ticket"
          title={person !== 'all' || doctorFilter !== 'all' ? 'Nothing matches these filters' : `No ${tab} bookings`}
          hint={person !== 'all' || doctorFilter !== 'all'
            ? 'Try another patient or doctor, or clear the filters.'
            : tab === 'upcoming' ? 'Book a consultation and it will appear here.' : `You have no ${tab} consultations yet.`}
          action={person !== 'all' || doctorFilter !== 'all' ? 'Clear filters' : tab === 'upcoming' ? 'Find a doctor' : undefined}
          onAction={() => {
            if (person !== 'all' || doctorFilter !== 'all') { setPerson('all'); setDoctorFilter('all'); return; }
            window.location.href = '/p/explore';
          }}
        />
      ) : (
        <div className="space-y-6">
          {byDay.map((day) => (
            <section key={day.date} className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Icon name="calendar" className="w-4 h-4 text-mg-teal" />
                {/^(Today|Tomorrow|Yesterday)$/.test(relativeDay(day.date)) ? (
                  <><span className="text-slate-900">{relativeDay(day.date)}</span><span>· {fullDate(day.date)}</span></>
                ) : (
                  <span className="text-slate-900">{fullDate(day.date)}</span>
                )}
                <span className="text-slate-400 font-medium">· {day.items.length} token{day.items.length === 1 ? '' : 's'}</span>
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {day.items.map((t) => (
                  <BookingCard
                    key={t._id}
                    t={t}
                    personOf={personOf}
                    review={reviewByToken.get(t._id)}
                    onPass={() => setPass(t)}
                    onCancel={() => cancel(t)}
                    onRate={() => setRating(t)}
                    onRefetch={refetch}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BookingPass token={pass} onDone={() => setPass(null)} />
      <RatingDialog
        token={rating}
        existing={rating ? reviewByToken.get(rating._id) : null}
        onDone={(saved) => {
          setDismissed((d) => new Set(d).add(rating?._id));
          setRating(null);
          if (saved) refetchReviews();
        }}
      />
    </div>
  );
}

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

/** "Mon, 2 Nov 2026" — the date written out, never just "Tomorrow". */
const fullDate = (iso) => (iso
  ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
  : '');

const SHIFT_LABEL = { MORNING: 'Morning sitting', AFTERNOON: 'Afternoon sitting', EVENING: 'Evening sitting' };

const addMinutes = (hhmm, mins) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  const total = h * 60 + (m || 0) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * One booking: who it is for, with which doctor, and exactly when — the
 * date written out, the sitting and its hours, and roughly when this token
 * number comes up (opening + (n − 1) × the doctor's average consult).
 */
function BookingCard({ t, personOf, review, onPass, onCancel, onRate, onRefetch }) {
  const doc = t.doctorId || {};
  const avg = doc.avgConsultMinutes || 8;
  const expected = t.startTime ? addMinutes(t.startTime, (t.tokenNumber - 1) * avg) : null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const live = t.date === today && [TOKEN_STATUS.WAITING, TOKEN_STATUS.IN_CHAMBER].includes(t.status);
  const who = personOf(t);

  return (
    <article className="mg-card p-0 overflow-hidden flex flex-col">
      {t.status === 'RESCHEDULE_NEEDED' && (
        <div className="p-3 pb-0"><RescheduleBanner token={{ ...t, tokenId: t._id }} onDone={onRefetch} /></div>
      )}
      <div className="px-4 pt-3"><FollowUpPrompt token={t} onDone={onRefetch} /></div>

      {/* Who the visit is for — the first thing to check when a family books. */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-mg-teal/10 text-mg-tealDark grid place-items-center text-[11px] font-bold shrink-0">{initials(who)}</span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 leading-none">Patient</span>
            <span className="block text-sm font-semibold text-slate-900 truncate">{who}</span>
          </span>
        </span>
        <StatusBadge status={t.status} pulse={t.status === TOKEN_STATUS.IN_CHAMBER} />
      </div>

      <div className="flex items-start gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{doc.name}</p>
          <p className="text-xs truncate">
            <span className="text-mg-teal font-medium">{doc.specialty}</span>
            <span className="text-slate-500"> · {t.hospitalId?.name}</span>
            {doc.chamberNumber && <span className="text-slate-500"> · Chamber {doc.chamberNumber}</span>}
          </p>
        </div>
        <div className="shrink-0 text-center rounded-xl bg-mg-surface px-3 py-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Token</span>
          <span className="block text-2xl font-bold text-mg-navy leading-tight">{token(t.tokenNumber)}</span>
        </div>
      </div>

      {/* When, exactly. */}
      <dl className="mx-4 grid grid-cols-2 sm:grid-cols-3 gap-px rounded-xl overflow-hidden bg-slate-200 border border-slate-200 text-[11px]">
        <div className="bg-white px-3 py-2">
          <dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Date</dt>
          <dd className="font-semibold text-slate-900">{fullDate(t.date)}</dd>
        </div>
        <div className="bg-white px-3 py-2">
          <dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Slot</dt>
          <dd className="font-semibold text-slate-900">
            {t.startTime
              ? <>{SHIFT_LABEL[t.shift] ?? 'Sitting'}<span className="block font-medium text-slate-500">{time12(t.startTime)} – {time12(t.endTime)}</span></>
              : 'In arrival order'}
          </dd>
        </div>
        <div className="bg-white px-3 py-2 col-span-2 sm:col-span-1">
          <dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Expected time</dt>
          <dd className="font-semibold text-mg-tealDark">{expected ? `~ ${time12(expected)}` : '—'}</dd>
        </div>
      </dl>

      <p className="px-4 pt-2 text-[11px] text-slate-500">
        {VISIT_LABEL[t.visitType] ?? 'Visit'}
        {t.isPaid ? <span className="text-mg-teal font-semibold"> · Paid</span> : <span className="text-amber-600 font-semibold"> · Pay at the clinic desk</span>}
      </p>
      {t.status === 'CANCELLED' && (
        <p className={`px-4 text-[11px] mt-0.5 ${t.cancelledByRole && t.cancelledByRole !== 'PATIENT' ? 'text-rose-600' : 'text-slate-500'}`}>
          {t.cancelledByRole && t.cancelledByRole !== 'PATIENT'
            ? `Cancelled by the clinic${t.cancelReason ? ` — ${t.cancelReason}` : ''}`
            : 'You cancelled this booking'}
          {t.isPaid && ' · fee not refunded'}
        </p>
      )}

      <div className="mt-3 px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
        {live && (
          <Link to="/p/tracker" className="mr-auto text-xs font-semibold text-mg-teal hover:underline inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-mg-teal animate-pulse" /> Track live
          </Link>
        )}
        {/* Available paid or unpaid: an unpaid pass is what gets the patient
            past the front desk, so it has to be printable. */}
        <Button variant="secondary" size="sm" onClick={onPass}>
          <Icon name="doc" className="w-3.5 h-3.5" /> Pass
        </Button>
        {t.status === TOKEN_STATUS.WAITING && (
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        )}
        {/* Rating lives on the completed consultation it is about, so a
            patient can rate an older visit they skipped at the time. */}
        {t.status === TOKEN_STATUS.COMPLETED && (
          <Button variant={review ? 'secondary' : 'primary'} size="sm" onClick={onRate}>
            {review ? 'Your rating' : 'Rate visit'}
          </Button>
        )}
      </div>
    </article>
  );
}
