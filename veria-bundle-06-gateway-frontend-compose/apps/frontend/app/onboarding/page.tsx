'use client';
import { useEffect, useState } from 'react';
import { Card, Button } from '@veria/components';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export default function OnboardingPage() {
  const [health, setHealth] = useState<any>(null);
  const [registerResult, setRegisterResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${GATEWAY}/identity/health`).then(r => r.json()).then(setHealth).catch(() => setHealth({ error: true }));
  }, []);

  const beginRegister = async () => {
    const res = await fetch(`${GATEWAY}/auth/passkey/register`, { method: 'POST', headers: { 'content-type': 'application/json' } });
    setRegisterResult(await res.json());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Investor Onboarding</h1>
      <Card>
        <div className="mb-4">Identity service health:</div>
        <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto">{JSON.stringify(health, null, 2)}</pre>
        <Button variant="primary" onClick={beginRegister} className="mt-4">Begin Passkey Registration (Mock)</Button>
        {registerResult && (
          <pre className="bg-gray-100 p-3 rounded-xl text-xs overflow-auto mt-4">{JSON.stringify(registerResult, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}
