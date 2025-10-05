
export type Context = Record<string, any> & { type: string };
export type IntentResult = { status: 'ok'; data?: any } | { status: 'error'; error: string };

export interface BridgeOptions {
  baseUrl?: string; // e.g. http://localhost:4000
  token?: string;
  timeoutMs?: number;
}

const DEFAULTS: Required<Pick<BridgeOptions, 'timeoutMs'>> = { timeoutMs: 5000 };

export class BridgeClient {
  private baseUrl: string;
  private token?: string;
  private timeoutMs: number;

  constructor(opts: BridgeOptions = {}) {
    this.baseUrl = opts.baseUrl ?? 'http://localhost:4000';
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;
  }

  private async _post(path: string, body: any) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), this.timeoutMs);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }).catch((e) => {
      throw new Error(`bridge request failed: ${e}`);
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`bridge responded ${res.status}`);
    return res.json();
  }

  async broadcast(context: Context, channelId?: string): Promise<void> {
    await this._post('/v1/context/broadcast', { context, channelId });
  }

  async raiseIntent(intent: string, context?: Context): Promise<IntentResult> {
    return this._post('/v1/intents/raise', { intent, context });
  }

  async joinUserChannel(channelId: string): Promise<{ channelId: string }> {
    return this._post('/v1/channels/join', { channelId });
  }
}
