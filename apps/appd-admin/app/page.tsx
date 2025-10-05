
'use client';

import { useEffect, useState } from 'react';

type AppEntry = {
  id: string;
  name: string;
  intents?: string[];
  url?: string;
};

export default function Page() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [form, setForm] = useState<AppEntry>({ id: '', name: '', intents: [], url: '' });

  const load = async () => {
    const res = await fetch('http://localhost:4001/v1/apps');
    setApps(await res.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:4001/v1/apps', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ id: '', name: '', intents: [], url: '' });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>AppD Admin</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="id" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
        <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <button type="submit">Create</button>
      </form>

      <h2 style={{ marginTop: 24 }}>Apps</h2>
      <ul>
        {apps.map((a) => (<li key={a.id}>{a.id} — {a.name} {a.url ? `(${a.url})` : ''}</li>))}
      </ul>
    </main>
  );
}
