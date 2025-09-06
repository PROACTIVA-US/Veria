'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, Button } from '@veria/components';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

function jsonDiff(a: any, b: any) {
  // Very small diff: show keys that differ and their values from both sides
  const keys = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})])).sort();
  const out: any[] = [];
  for (const k of keys) {
    const va = JSON.stringify(a?.[k]);
    const vb = JSON.stringify(b?.[k]);
    if (va !== vb) out.push({ key: k, a: a?.[k], b: b?.[k] });
  }
  return out;
}

export default function PoliciesAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [selA, setSelA] = useState<string>('');
  const [selB, setSelB] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${GATEWAY}/policies`);
    const js = await res.json();
    setItems(js.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const polA = useMemo(() => items.find(x => x.id === selA), [items, selA]);
  const polB = useMemo(() => items.find(x => x.id === selB), [items, selB]);
  const diffs = useMemo(() => jsonDiff(polA?.body, polB?.body), [polA, polB]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Policies</h1>
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" onClick={load} disabled={loading}>Reload</Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">ID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Version</th>
              <th className="py-2">Fingerprint</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.id}</td>
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.version}</td>
                <td className="py-2 font-mono text-xs">{p.fingerprint}</td>
                <td className="py-2 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Diff Two Policies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Policy A</div>
            <select className="border rounded-xl px-3 py-2 w-full" value={selA} onChange={e => setSelA(e.target.value)}>
              <option value="">(select)</option>
              {items.map(p => <option key={p.id} value={p.id}>{p.name} ({p.version})</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Policy B</div>
            <select className="border rounded-xl px-3 py-2 w-full" value={selB} onChange={e => setSelB(e.target.value)}>
              <option value="">(select)</option>
              {items.map(p => <option key={p.id} value={p.id}>{p.name} ({p.version})</option>)}
            </select>
          </label>
        </div>
        {(polA && polB) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto max-h-[40vh]">{JSON.stringify(polA.body, null, 2)}</pre>
            <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto max-h-[40vh]">{JSON.stringify(polB.body, null, 2)}</pre>
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2">Diff Keys</h3>
              <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto">{JSON.stringify(diffs, null, 2)}</pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
