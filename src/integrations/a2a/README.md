A2A Client

This folder contains a minimal A2A (agent-to-agent) client used for calling other agents via HTTP or using a built-in mock.

Files:
- a2a-client.ts - lightweight A2AClient with timeout and retry, uses `node-fetch`.
- test-a2a.ts - a small script that exercises the mock client.

Run the test harness (requires ts-node):

```powershell
npx ts-node src/integrations/a2a/test-a2a.ts
```

If you want real HTTP calls, instantiate `A2AClient({ baseUrl: 'http://other-agent:port/agent-endpoint' })`.
