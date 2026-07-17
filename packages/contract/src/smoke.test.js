/**
 * Smoke tests for QMF 4.0-alpha packages (vanilla JS, no vitest required).
 * Run: node packages/contract/src/smoke.test.js
 */
import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, loadContract, loadManifestGraph, topologicalOrder } from './index.js';
import { defineEvent, emit, subscribe, events } from '@qmf/events';
import { runDoctor } from '@qmf/inspect/doctor';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const example = join(root, 'docs/v4/examples/app');

// validate
{
  const r = validate(
    { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
    { a: 'x' },
  );
  assert.equal(r.ok, true);
  const bad = validate({ type: 'string', minLength: 2 }, 'a');
  assert.equal(bad.ok, false);
}

// contract + graph
{
  const c = loadContract(join(example, 'qmf.schema.json'));
  assert.equal(c.language, 'js');
  const g = loadManifestGraph(c, example);
  const order = topologicalOrder(g);
  assert.deepEqual(order, ['auth', 'dictionary']);
}

// events
{
  events._reset();
  const Ev = defineEvent({
    name: 'test.ping',
    namespace: 'test',
    version: 1,
    description: 'ping event for smoke test',
    payload: { type: 'object', required: ['n'], properties: { n: { type: 'number' } } },
    producers: ['test'],
    consumers: [],
  });
  let seen = 0;
  subscribe(Ev, (p) => {
    seen = p.n;
  });
  emit(Ev, { n: 7 }, {
    validate: (schema, data) => validate(schema, data),
  });
  assert.equal(seen, 7);
}

// doctor
{
  const d = runDoctor(example, { strict: true });
  assert.equal(d.ok, true, JSON.stringify(d.findings, null, 2));
}

console.log('✓ all smoke tests passed');
