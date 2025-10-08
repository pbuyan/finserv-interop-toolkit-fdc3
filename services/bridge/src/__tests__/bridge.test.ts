import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createBridgeApp } from '../index.js';

let baseUrl = '';
const app = createBridgeApp();
const server = app.listen(0);

before(async () => {
  baseUrl = await new Promise<string>((resolve) => {
    server.once('listening', () => {
      const address = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
});

after(() => {
  server.close();
});

test('agent info includes default intent', async () => {
  const res = await fetch(`${baseUrl}/agent/info`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert(Array.isArray(body.intents));
  assert(body.intents.includes('ViewChart'));
});

test('raiseIntent returns 404 for unknown intent', async () => {
  const res = await fetch(`${baseUrl}/v1/intents/raise`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intent: 'UnknownIntent' }),
  });
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'No handler registered for intent UnknownIntent');
});

test('broadcast validates payload', async () => {
  const res = await fetch(`${baseUrl}/v1/context/broadcast`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_failed');
});
