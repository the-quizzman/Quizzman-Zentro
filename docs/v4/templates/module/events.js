import { defineEvent } from '@qmf/events';

export const SampleReadyPayload = {
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: {
    ok: { type: 'boolean' },
  },
};

export const SampleReady = defineEvent({
  name: 'sample.ready',
  namespace: 'sample',
  version: 1,
  description: 'Emitted when sample module is ready.',
  payload: SampleReadyPayload,
  producers: ['sample'],
  consumers: [],
});
