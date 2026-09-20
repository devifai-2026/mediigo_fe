import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon.jsx';

export default function ForbiddenView() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 grid place-items-center mx-auto mb-4">
          <Icon name="shield" className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Not your area</h1>
        <p className="text-xs text-slate-500 mt-2">Your role does not have access to this part of Mediigo.</p>
        <Link to="/" className="inline-block mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs">
          Back to my dashboard
        </Link>
      </div>
    </div>
  );
}
