import test from 'node:test';
import assert from 'node:assert/strict';
import { LegatusClient } from '../../packages/legatus/src/runtime/core/client.js';

test('disconnect during token retrieval cannot create a late WebSocket', async () => {
  let resolveToken;
  let opened = 0;
  const oldWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = class { static OPEN = 1; static CONNECTING = 0; constructor() { opened++; } };
  try {
    const state = {};
    const client = new LegatusClient({ endpoint: 'https://isolated.example', transport: 'ws', getToken: () => new Promise(resolve => { resolveToken = resolve; }), bus: { emit() {} }, store: { get: () => state, set: partial => Object.assign(state, partial) } });
    const connecting = client.connect();
    client.disconnect();
    resolveToken('test-token');
    await connecting;
    assert.equal(opened, 0);
  } finally { globalThis.WebSocket = oldWebSocket; }
});
