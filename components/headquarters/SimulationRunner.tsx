'use client';

/**
 * SimulationRunner (Platform Transformation, Wave 6).
 *
 * Runs a single live simulator. Walk-throughs render the real protocol steps with their timeframes; calculators take
 * the participant's own numbers and show the arithmetic live; the illustration draws the fixed example. The
 * educational framing sits at the top of every run, never buried — no predictions, no advice.
 */
import { useMemo, useState } from 'react';
import { Surface } from '@/components/headquarters/HQTheme';
import { getSimulator } from '@/lib/simulations/model';
import {
  lostPhoneWalkthrough, inheritanceEventWalkthrough, emergencyFund, incomeLossRunway, longTermThinkingIllustration,
  type WalkStep,
} from '@/lib/simulations/engines';
import { Info } from 'lucide-react';

export function SimulationRunner({ id }: { id: string }) {
  const sim = getSimulator(id);
  if (!sim || sim.status !== 'live') return null;
  return (
    <Surface>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--hq-ink)' }}>{sim.title}</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--hq-ink-soft)' }}>{sim.premise}</p>
      <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--hq-gold-wash)', border: '1px solid var(--hq-edge)' }}>
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--hq-ink-faint)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{sim.framing}</p>
      </div>
      <div className="mt-5">
        {id === 'lost-phone' && <Walkthrough steps={lostPhoneWalkthrough()} />}
        {id === 'inheritance-event' && <Walkthrough steps={inheritanceEventWalkthrough()} />}
        {id === 'emergency-fund' && <EmergencyFundCalc />}
        {id === 'income-loss' && <IncomeLossCalc />}
        {id === 'long-term-thinking' && <LongTermIllustration />}
      </div>
    </Surface>
  );
}

function Walkthrough({ steps }: { steps: WalkStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.phase} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--hq-stone)', color: 'var(--hq-gold)', border: '1px solid var(--hq-edge)' }}>{s.phase}</span>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{s.title}</p>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>{s.timing}</span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>{label}</span>
      <input type="number" min={0} value={value === 0 ? '' : value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ background: 'var(--hq-stone)', border: '1px solid var(--hq-edge)', color: 'var(--hq-ink)' }} />
    </label>
  );
}

function ResultLine({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--hq-stone)', color: 'var(--hq-ink)', border: '1px solid var(--hq-edge)' }}>{text}</p>;
}

function EmergencyFundCalc() {
  const [expenses, setExpenses] = useState(0);
  const [savings, setSavings] = useState(0);
  const result = useMemo(() => emergencyFund({ monthlyExpenses: expenses, savings }), [expenses, savings]);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Monthly expenses" value={expenses} onChange={setExpenses} />
        <NumberField label="Current savings" value={savings} onChange={setSavings} />
      </div>
      <ResultLine text={result.summary} />
    </div>
  );
}

function IncomeLossCalc() {
  const [expenses, setExpenses] = useState(0);
  const [savings, setSavings] = useState(0);
  const [income, setIncome] = useState(0);
  const result = useMemo(() => incomeLossRunway({ monthlyExpenses: expenses, savings, newMonthlyIncome: income }), [expenses, savings, income]);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Monthly expenses" value={expenses} onChange={setExpenses} />
        <NumberField label="Current savings" value={savings} onChange={setSavings} />
        <NumberField label="New monthly income" value={income} onChange={setIncome} />
      </div>
      <ResultLine text={expenses === 0 ? 'Enter your monthly expenses to begin.' : result.summary} />
    </div>
  );
}

function LongTermIllustration() {
  const { series, steadyEndValue, reactiveEndValue, lesson } = useMemo(() => longTermThinkingIllustration(), []);
  const max = Math.max(...series.map((p) => p.value));
  const min = Math.min(...series.map((p) => p.value));
  const W = 320, H = 120, pad = 8;
  const x = (i: number) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const lowIdx = series.findIndex((p) => p.value === min);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A fixed example price curve that dips then recovers">
        <path d={path} fill="none" stroke="var(--hq-gold)" strokeWidth={2} />
        <circle cx={x(lowIdx)} cy={y(min)} r={3.5} fill="#CF9356" />
        <circle cx={x(series.length - 1)} cy={y(steadyEndValue)} r={3.5} fill="#5FA17F" />
      </svg>
      <div className="mt-3 flex gap-4 text-xs">
        <span style={{ color: '#5FA17F' }}>Stayed steady → {steadyEndValue}</span>
        <span style={{ color: '#CF9356' }}>Sold at the low → {reactiveEndValue}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{lesson}</p>
    </div>
  );
}
