import { createModuleStore } from '@qmf/runtime';

export const StateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ready'],
  properties: {
    ready: { type: 'boolean' },
  },
};

export const initialState = { ready: false };

export function createSampleStore() {
  return createModuleStore('sample', initialState, StateSchema);
}
