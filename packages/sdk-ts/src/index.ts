export type Health = { status: 'ok'; name?: string; ts?: string };

export interface ClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

export class VeriaClient {
  constructor(private opts: ClientOptions) {}
  async health(path: string = '/health'): Promise<Health> {
    const res = await fetch(this.opts.baseUrl + path, { headers: this.opts.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async registerPasskey(): Promise<{ todo: true }> { return { todo: true }; }
  async listPolicies(): Promise<{ items: any[] }> {
    const res = await fetch(this.opts.baseUrl + '/policies');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
