
'use client';

import { useState } from 'react';
import { BridgeClient } from '@finserv/bridge-sdk';

const bridge = new BridgeClient({ baseUrl: 'http://localhost:4000' });

export default function Page() {
  const [log, setLog] = useState<string[]>([]);

  const append = (s: string) => setLog((prev) => [s, ...prev].slice(0, 100));

  async function doBroadcast() {
    await bridge.broadcast({ type: 'fdc3.instrument', id: { ticker: 'AAPL' } } as any, 'red');
    append('broadcast fdc3.instrument on channel "red"');
  }

  async function doRaise() {
    const res = await bridge.raiseIntent('ViewChart', { type: 'fdc3.instrument', id: { ticker: 'AAPL' } } as any);
    append('raiseIntent ViewChart -> ' + JSON.stringify(res));
  }

  async function join() {
    const res = await bridge.joinUserChannel('red');
    append('joinUserChannel -> ' + JSON.stringify(res));
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>DevTools</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={join}>Join "red"</button>
        <button onClick={doBroadcast}>Broadcast Instrument</button>
        <button onClick={doRaise}>Raise ViewChart</button>
      </div>
      <pre style={{ marginTop: 16, background: '#111', color: '#eee', padding: 12, minHeight: 200 }}>
        {log.join('\n')}
      </pre>
    </main>
  );
}
