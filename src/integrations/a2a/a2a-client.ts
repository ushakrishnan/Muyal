import fetch from 'node-fetch';

export interface A2AClientOptions {
  baseUrl?: string; // optional base URL for remote agents
  timeoutMs?: number;
  maxRetries?: number;
}

export class A2AClient {
  private baseUrl?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: A2AClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  // Call a remote agent tool via HTTP POST. If baseUrl is not set, attempt a local mock call.
  public async callAgent(toolName: string, args: any = {}, endpoint?: string): Promise<any> {
    const url = endpoint || this.baseUrl;
    if (!url) {
      // No remote configured; use in-process/mock behaviour
      return this.mockCall(toolName, args);
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ tool: toolName, args }),
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal as any,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Agent call failed: ${res.status} ${res.statusText} - ${text}`);
        }

        const body = await res.json();
        return body;
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) throw err;
        // simple backoff
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  // Lightweight mock for local testing; can be replaced by a registry or plugin system.
  private async mockCall(toolName: string, args: any): Promise<any> {
    // Provide a few canned responses to enable local integration testing without remote agents.
    if (toolName === 'echo') {
      return { echoed: args };
    }

    if (toolName === 'list_tools') {
      return { tools: ['echo', 'health', 'list_tools'] };
    }

    return { message: `No remote agent configured and no mock found for tool: ${toolName}` };
  }
}

export default A2AClient;
