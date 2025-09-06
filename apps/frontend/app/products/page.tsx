'use client';
import { useEffect, useState } from 'react';
import { Card, Button, EligibilityBadge } from '@veria/components';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

type SimInput = { jurisdiction?: string; accredited?: boolean; sanctionsHit?: boolean; amountUsd?: number };

export default function ProductsPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [simInput, setSimInput] = useState<SimInput>({ jurisdiction: 'US', accredited: true, sanctionsHit: false, amountUsd: 1000 });
  const [sim, setSim] = useState<any>(null);

  const load = () => fetch(`${GATEWAY}/policies`).then(r => r.json()).then(d => setPolicies(d.items || []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    await fetch(`${GATEWAY}/policies`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        version: '0.1',
        metadata: { name: 'US T-Bill Access', jurisdiction: ['US'], applies_to: ['subscription','transfer'] },
        requirements: { sanctions: 'none', accreditation: { required: true } },
        transfer_controls: { allowed_jurisdictions: ['US','CA','UK'] },
        limits: { per_investor_usd_total: 1000000 }
      })
    });
    setCreating(false);
    load();
  };

  const simulate = async () => {
    const res = await fetch(`${GATEWAY}/policies/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: simInput }) });
    setSim(await res.json());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Products (Policies)</h1>
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="primary" onClick={create} disabled={creating}>Create Policy</Button>
          <Button variant="ghost" onClick={load}>Reload</Button>
        </div>
        <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto">{JSON.stringify(policies, null, 2)}</pre>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Simulate Eligibility</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Jurisdiction</div>
            <select className="border rounded-xl px-3 py-2 w-full" value={simInput.jurisdiction} onChange={e => setSimInput({ ...simInput, jurisdiction: e.target.value })}>
              <option>US</option>
              <option>CA</option>
              <option>UK</option>
              <option>FR</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Accredited</div>
            <select className="border rounded-xl px-3 py-2 w-full" value={String(simInput.accredited)} onChange={e => setSimInput({ ...simInput, accredited: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Sanctions Hit</div>
            <select className="border rounded-xl px-3 py-2 w-full" value={String(simInput.sanctionsHit)} onChange={e => setSimInput({ ...simInput, sanctionsHit: e.target.value === 'true' })}>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Amount (USD)</div>
            <input type="number" className="border rounded-xl px-3 py-2 w-full" value={simInput.amountUsd || 0} onChange={e => setSimInput({ ...simInput, amountUsd: Number(e.target.value) })} />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" onClick={simulate}>Run Simulation</Button>
          {sim?.outcome && <EligibilityBadge status={sim.outcome} />}
        </div>
        {sim && (
          <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto mt-3">{JSON.stringify(sim, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}
