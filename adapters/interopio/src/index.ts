
export interface Adapter {
  name: 'interopio';
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(context: any, channelId?: string): Promise<void>;
  raiseIntent(intent: string, context?: any): Promise<any>;
  joinUserChannel(channelId: string): Promise<void>;
}

export class InteropioAdapter implements Adapter {
  name = 'interopio';
  async start() { /* TODO */ }
  async stop() { /* TODO */ }
  async broadcast(_context: any, _channelId?: string) { /* TODO */ }
  async raiseIntent(_intent: string, _context?: any) { return { handledBy: 'placeholder' }; }
  async joinUserChannel(_channelId: string) { /* TODO */ }
}
