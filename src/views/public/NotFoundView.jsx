import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui/Icon.jsx';

export default function NotFoundView() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <Logo className="w-14 h-14 mx-auto mb-4" rounded="rounded-2xl" />
        <h1 className="text-2xl font-black text-slate-900">Page not found</h1>
        <p className="text-xs text-slate-500 mt-2">That link does not lead anywhere on Mediigo.</p>
        <Link to="/" className="inline-block mt-5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs">
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
}
