import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const serviceDir = path.resolve(process.argv[2] ?? '.');
const entry = process.argv[3] ?? 'dist/index.js';
const distDir = path.dirname(path.resolve(serviceDir, entry));
const entryPath = path.resolve(serviceDir, entry);

fs.mkdirSync(distDir, { recursive: true });

const isWin = process.platform === 'win32';
const tscBin = isWin ? 'tsc.cmd' : 'tsc';

const spawnOpts = { cwd: serviceDir, stdio: 'inherit' };

const tsc = spawn(tscBin, ['-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], spawnOpts);

const startServer = () => spawn(process.execPath, [entryPath], spawnOpts);

let server = startServer();
let restartTimer = null;

const scheduleRestart = () => {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (server) {
      server.kill();
    }
    server = startServer();
  }, 200);
};

try {
  fs.watch(distDir, { recursive: true }, scheduleRestart);
} catch (error) {
  console.error(`Failed to watch ${distDir}:`, error);
}

const shutdown = () => {
  if (restartTimer) clearTimeout(restartTimer);
  if (server) server.kill();
  tsc.kill();
  process.exit(0);
};

tsc.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`tsc exited with code ${code}`);
  }
  shutdown();
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);