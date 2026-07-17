import { createModuleStore } from '@qmf/runtime';

export const StateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['query', 'results', 'authed'],
  properties: {
    query: { type: 'string' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
        },
      },
    },
    authed: { type: 'boolean' },
  },
};

export const initialState = {
  query: '',
  results: [],
  authed: false,
};

export function createDictionaryStore() {
  return createModuleStore('dictionary', initialState, StateSchema);
}
