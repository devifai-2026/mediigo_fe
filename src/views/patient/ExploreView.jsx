import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../lib/api.js';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { DarkHero, LivePill } from '../../components/layout/DarkHero.jsx';
import { DoctorCard } from '../../components/patient/DoctorCard.jsx';
import { BookingSheet } from '../../components/patient/BookingSheet.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { SPECIALTIES } from '../../lib/constants.js';
import clsx from 'clsx';

export default function ExploreView() {
  const { coords, locate, status: geoStatus } = useGeolocation();
  const { isAuthed } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(15);
  const [booking, setBooking] = useState(null);

  const load = useCallback(async (c = coords) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lng: c.lng, lat: c.lat, radiusKm: radius });
      if (specialty) params.set('specialty', specialty);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/api/doctors/nearby?${params}`);
      setRows(res.data.data || []);
      setMeta(res.data.meta);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [coords, radius, specialty, search, toast]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [specialty, radius]);

  const useMyLocation = async () => {
    const c = await locate();
    if (geoStatus === 'denied') toast.warn('Location permission denied — showing Kolkata city centre');
    load(c);
  };

  const onBook = (doctor) => {
    if (!isAuthed) {
      toast.push('Sign in to book a token');
      navigate('/login', { state: { from: '/explore' } });
      return;
    }
    setBooking(doctor);
  };

  return (
    <div className="space-y-6">
      <DarkHero>
        <LivePill />
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mt-3">
          Find OPD doctors nearby.<br />Book tokens and track the live queue.
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-xl">
          Skip the crowded waiting room. Get a digital token, real-time wait estimates and a alert when your turn is close.
        </p>

        <div className="mt-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-xl text-slate-900 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-4 flex items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Icon name="location" className="w-4 h-4 text-teal-600 mr-2 shrink-0" />
            <div className="flex-grow min-w-0">
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Search radius</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="bg-transparent text-xs font-bold w-full focus:outline-none cursor-pointer"
              >
                {[5, 10, 15, 25, 50].map((r) => <option key={r} value={r}>Within {r} km</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition text-[11px] font-bold border border-teal-200 shrink-0"
            >
              Near me
            </button>
          </div>

          <form
            className="md:col-span-8 flex items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-200"
            onSubmit={(e) => { e.preventDefault(); load(); }}
          >
            <Icon name="search" className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <div className="flex-grow min-w-0">
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Doctor, clinic or specialty</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Dr. Dhore, Cardiology…"
                className="bg-transparent text-xs font-semibold w-full focus:outline-none placeholder:text-slate-400"
              />
            </div>
            {search && (
              <button type="button" onClick={() => { setSearch(''); load(); }} className="text-slate-400 hover:text-slate-600 px-1">
                <Icon name="cross" className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </DarkHero>

      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSpecialty('')}
            className={clsx('text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap transition shadow-sm border',
              !specialty ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100')}
          >
            All clinics
          </button>
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialty(s === specialty ? '' : s)}
              className={clsx('text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition shadow-sm border',
                specialty === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100')}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Available OPD doctors</h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {loading ? 'Searching…' : `${rows.length} found`}
            {meta?.distanceSource === 'HAVERSINE' && !loading && (
              <span className="ml-1 text-slate-400" title="Add a Google Maps key for road distance">· straight-line</span>
            )}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : rows.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((d) => <DoctorCard key={d.doctorId} doctor={d} onBook={onBook} />)}
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No clinics found nearby"
            hint="Try a wider radius, clear the specialty filter, or search by a doctor's name."
            action="Reset filters"
            onAction={() => { setSpecialty(''); setSearch(''); setRadius(25); }}
          />
        )}
      </div>

      <BookingSheet doctor={booking} onClose={() => setBooking(null)} />
    </div>
  );
}
