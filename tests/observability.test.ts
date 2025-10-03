import fs from 'fs';
import path from 'path';

jest.useRealTimers();

describe('observability', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const errorsFile = path.join(logsDir, 'error-entities.jsonl');
  const metricsFile = path.join(logsDir, 'metrics.jsonl');
  beforeAll(() => {
    try { if (fs.existsSync(errorsFile)) fs.unlinkSync(errorsFile); } catch { }
    try { if (fs.existsSync(metricsFile)) fs.unlinkSync(metricsFile); } catch { }
  });

  test('logError writes local file and calls Cosmos upsert when client present', async () => {
    // Mock the Cosmos helper
    const mockUpsert = jest.fn(async () => Promise.resolve());
    const mockClient = {
      database: (dbName: string) => ({ id: dbName, container: () => ({ items: { upsert: mockUpsert } }) })
    } as any;

    // Spy on the module that performs the upsert
    const observability = require('../src/core/observability').default;

    const entry = { timestamp: new Date().toISOString(), sourceId: 'test-src', operation: 'test-op', error: 'simulated' };
    await observability.logError(entry, mockClient, 'testdb');

    // Verify local file written
    expect(fs.existsSync(errorsFile)).toBe(true);
    const content = fs.readFileSync(errorsFile, 'utf8');
    expect(content.includes('test-src')).toBe(true);

    // Verify mock upsert called
    // Our observability uses error-logger.logErrorToCosmos which calls container.items.upsert internally; ensure our mockUpsert saw an item
    expect(mockUpsert).toHaveBeenCalled();
    // Verify metric writing via a latency and counter
    await observability.recordLatency('test.latency', 123, { tag: 'x' });
    await observability.incrementCounter('test.counter', { tag: 'x' });
    expect(fs.existsSync(metricsFile)).toBe(true);
    const metricsContent = fs.readFileSync(metricsFile, 'utf8');
    expect(metricsContent.includes('test.latency') || metricsContent.includes('test.counter')).toBe(true);
  });
});
