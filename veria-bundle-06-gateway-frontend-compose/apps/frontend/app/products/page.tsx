'use client';
import { useEffect, useState } from 'react';
import { Card, Button } from '@veria/components';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export default function ProductsPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = () => fetch(`${GATEWAY}/policies`).then(r => r.json()).then(d => setPolicies(d.items || []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    await fetch(`${GATEWAY}/policies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'US T-Bill Access', version: '0.1' })
    });
    setCreating(false);
    load();
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
    </div>
  );
}
