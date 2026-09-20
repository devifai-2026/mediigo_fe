import { useState } from 'react';
import clsx from 'clsx';
import { api, unwrap } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { DarkHero } from '../../components/layout/DarkHero.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { inr } from '../../lib/format.js';

const SEVERITY = {
  CRITICAL: 'bg-rose-50 border-rose-200 text-rose-700',
  HIGH: 'bg-amber-50 border-amber-200 text-amber-800',
  MEDIUM: 'bg-blue-50 border-blue-200 text-blue-800',
  LOW: 'bg-slate-50 border-slate-200 text-slate-600',
};

const GRADE_TONE = {
  A: 'text-emerald-600', B: 'text-emerald-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-rose-600',
};

/** Aadhaar is masked on screen, never persisted, and cleared once submitted. */
const maskAadhaar = (v) => v.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');

export default function VaultView() {
  const toast = useToast();
  const [aadhaar, setAadhaar] = useState('');
  const [stage, setStage] = useState('input'); // input | loading | result
  const [analysis, setAnalysis] = useState(null);
  const [policies, setPolicies] = useState([]);

  const analyze = async (e) => {
    e.preventDefault();
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length !== 12) { toast.error('Enter all 12 digits'); return; }

    setStage('loading');
    try {
      const vault = unwrap(await api.post('/api/policy/vault/lookup', { aadhaarNumber: digits }));
      const gaps = unwrap(await api.get(`/api/policy/vault/${vault.aadhaarHash}/gap-analysis`));
      setPolicies(vault.policies || []);
      setAnalysis(gaps);
      setStage('result');
      // The raw number leaves memory as soon as it has been hashed server-side.
      setAadhaar('');
    } catch (err) {
      toast.error(err.message);
      setStage('input');
    }
  };

  if (stage === 'loading') {
    return (
      <div className="space-y-4">
        <DarkHero><h2 className="text-xl font-bold">Analysing your cover…</h2></DarkHero>
        <SkeletonRows rows={4} />
      </div>
    );
  }

  if (stage === 'result' && analysis) {
    const r = analysis.recommendation;
    return (
      <div className="space-y-5">
        <DarkHero>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Policy vault</p>
              <h2 className="text-2xl font-extrabold mt-1">Your protection score</h2>
              <p className="text-xs text-slate-300 mt-1">
                {analysis.summary.policyCount} {analysis.summary.policyCount === 1 ? 'policy' : 'policies'} ·
                Tier-{analysis.meta.cityTier} benchmark for {analysis.meta.district}
              </p>
            </div>
            <div className="text-center bg-white/10 rounded-2xl border border-white/15 px-6 py-4">
              <span className={clsx('text-5xl font-black', GRADE_TONE[analysis.grade])}>{analysis.grade}</span>
              <p className="text-xs text-slate-300 mt-1">{analysis.protectionScore}/100</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Effective cover today</span>
              <span>{inr(analysis.summary.effectiveCover)} of {inr(analysis.summary.recommendedCover)} recommended</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, (analysis.summary.effectiveCover / analysis.summary.recommendedCover) * 100)}%` }}
              />
            </div>
            {analysis.summary.nominalCover > analysis.summary.effectiveCover && (
              <p className="text-[11px] text-amber-300">
                You hold {inr(analysis.summary.nominalCover)} on paper, but separate indemnity policies do not stack —
                a single hospitalisation draws on about {inr(analysis.summary.effectiveCover)}.
              </p>
            )}
          </div>
        </DarkHero>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            {analysis.gaps.length} {analysis.gaps.length === 1 ? 'gap' : 'gaps'} found
          </h3>
          {analysis.gaps.map((g) => (
            <div key={`${g.code}-${g.policyId ?? ''}`} className={clsx('rounded-2xl border p-4', SEVERITY[g.severity])}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/70 border border-current/20">
                      {g.severity}
                    </span>
                    <h4 className="font-bold text-sm">{g.title}</h4>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed opacity-90">{g.detail}</p>
                  <p className="text-xs mt-2 font-semibold flex items-start gap-1.5">
                    <Icon name="check" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {g.remedy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {r && (
          <div className="bg-hero-dark text-white rounded-3xl p-6 border border-slate-800">
            <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Recommended structure</p>
            <h3 className="text-xl font-extrabold mt-1">Base cover plus a super top-up</h3>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <span className="text-[10px] text-slate-300 block">Base policy</span>
                <span className="text-lg font-black text-teal-300">{inr(r.baseSumInsured)}</span>
              </div>
              {r.superTopUp && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-300 block">Super top-up</span>
                  <span className="text-lg font-black text-teal-300">{inr(r.superTopUp.sumInsured)}</span>
                  <span className="text-[10px] text-slate-400 block">over {inr(r.superTopUp.deductible)} deductible</span>
                </div>
              )}
              {r.criticalIllness && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-300 block">Critical illness</span>
                  <span className="text-lg font-black text-teal-300">{inr(r.criticalIllness.sumInsured)}</span>
                </div>
              )}
            </div>
            <ul className="mt-4 space-y-1.5">
              <li className="text-xs text-slate-300 flex items-start gap-2">
                <Icon name="check" className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                No room-rent sub-limit, which removes the proportionate-deduction risk entirely
              </li>
              {r.replaces.length > 0 && (
                <li className="text-xs text-slate-300 flex items-start gap-2">
                  <Icon name="check" className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                  Replaces {r.replaces.length} fragmented {r.replaces.length === 1 ? 'policy' : 'policies'}
                </li>
              )}
            </ul>
            <p className="text-[11px] text-slate-400 mt-4">
              Indicative premium {inr(r.estimatedPremiumRange.min)}–{inr(r.estimatedPremiumRange.max)} a year.
              {' '}{r.premiumNote}
            </p>
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={() => { setStage('input'); setAnalysis(null); }}>
          Check another Aadhaar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <DarkHero>
        <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Policy vault</p>
        <h2 className="text-2xl font-extrabold mt-1">Find the gaps in your health cover</h2>
        <p className="text-xs text-slate-300 mt-2">
          We look up policies linked to your Aadhaar and check them against real hospital costs in your city —
          room-rent limits, duplicated cover, and what a serious illness would actually cost you.
        </p>
      </DarkHero>

      <form onSubmit={analyze} className="glass-card rounded-3xl p-6 space-y-4">
        <Field label="Aadhaar number" required hint="Used only to look up linked policies. We store a one-way hash, never the number itself.">
          <Input
            inputMode="numeric"
            value={maskAadhaar(aadhaar)}
            onChange={(e) => setAadhaar(e.target.value)}
            placeholder="XXXX XXXX XXXX"
            className="tracking-widest font-mono"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={aadhaar.replace(/\D/g, '').length !== 12}>
          Analyse my cover
        </Button>
        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <Icon name="shield" className="w-3 h-3" /> Hashed on our server and discarded immediately
        </p>
      </form>
    </div>
  );
}
