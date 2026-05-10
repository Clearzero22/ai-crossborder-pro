import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as http from 'http';

let backendProcess: ChildProcess | null = null;

export function startBackend(
  backendDistDir: string,
  env: Record<string, string>,
): void {
  const entryPath = path.join(backendDistDir, 'api-server.js');

  backendProcess = fork(entryPath, [], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    silent: false,
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data: Buffer) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data: Buffer) => {
      console.error(`[Backend:err] ${data.toString().trim()}`);
    });
  }

  backendProcess.on('exit', (code, signal) => {
    console.log(`[Backend] Process exited (code=${code}, signal=${signal})`);
    backendProcess = null;
  });

  backendProcess.on('error', (err) => {
    console.error('[Backend] Failed to start:', err.message);
    backendProcess = null;
  });
}

export async function waitForReady(
  port: number,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  const retryInterval = 500;

  while (Date.now() - start < timeoutMs) {
    try {
      await healthCheck(port);
      return;
    } catch {
      await sleep(retryInterval);
    }
  }
  throw new Error(`Backend did not become ready within ${timeoutMs}ms`);
}

function healthCheck(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://localhost:${port}/api/health`,
      { timeout: 3000 },
      (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Health check returned ${res.statusCode}`));
        }
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

export function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Backend] Sending SIGTERM...');
    backendProcess.kill('SIGTERM');

    // Force kill after 5s
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('[Backend] Force killing...');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
