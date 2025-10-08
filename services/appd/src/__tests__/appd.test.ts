import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const dataPath = path.join(process.cwd(), 'tmp-app-directory-test.json');
process.env.APPD_DATA_PATH = dataPath;

const { createAppDirectoryApp } = await import('../index.js');

const app = createAppDirectoryApp();
const server = app.listen(0);
let baseUrl = '';

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
  if (fs.existsSync(dataPath)) {
    fs.rmSync(dataPath, { force: true });
  }
});

test('creates and retrieves app entries', async () => {
  const createRes = await fetch(`${baseUrl}/v1/apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'app-1', name: 'Test App' }),
  });
  assert.equal(createRes.status, 201);

  const listRes = await fetch(`${baseUrl}/v1/apps`);
  assert.equal(listRes.status, 200);
  const apps = await listRes.json();
  assert.equal(apps.length, 1);
  assert.equal(apps[0].id, 'app-1');
});

test('rejects duplicate ids', async () => {
  const res = await fetch(`${baseUrl}/v1/apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'app-1', name: 'Another App' }),
  });
  assert.equal(res.status, 409);
});

test('validates payloads', async () => {
  const res = await fetch(`${baseUrl}/v1/apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: '', name: '' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_failed');
});

test('updates and deletes app entries', async () => {
  const updateRes = await fetch(`${baseUrl}/v1/apps/app-1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Updated App', url: 'https://example.com' }),
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.name, 'Updated App');

  const deleteRes = await fetch(`${baseUrl}/v1/apps/app-1`, { method: 'DELETE' });
  assert.equal(deleteRes.status, 200);
  const deleted = await deleteRes.json();
  assert.equal(deleted.deleted, true);
});
