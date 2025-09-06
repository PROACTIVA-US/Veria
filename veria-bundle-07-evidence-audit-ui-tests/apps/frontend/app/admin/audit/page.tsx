'use client';
import { useEffect, useState } from 'react';
import { Card, Button, DecisionTraceModal } from '@veria/components';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const res = await fetch(`${GATEWAY}/audit/items?n=50`);
    const json = await res.json();
    setItems(json.items || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Audit Viewer</h1>
      <Card>
        <div className="mb-4 flex gap-2">
          <Button variant="ghost" onClick={load}>Reload</Button>
        </div>
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="p-3 rounded-xl bg-gray-50 border">
              <div className="text-xs text-gray-500">{it.ts} • {it.type}</div>
              <div className="mt-2">
                <DecisionTraceModal data={it} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
