import { defineEvent } from '@qmf/events';

export const DictionarySearchPayload = {
  type: 'object',
  additionalProperties: false,
  required: ['keyword', 'source'],
  properties: {
    keyword: { type: 'string', minLength: 1 },
    source: { type: 'string', enum: ['header', 'sidebar', 'api'] },
  },
};

export const DictionarySearch = defineEvent({
  name: 'dictionary.search',
  namespace: 'dictionary',
  version: 1,
  description: 'User submitted a dictionary search query.',
  payload: DictionarySearchPayload,
  producers: ['dictionary'],
  consumers: [],
});
