/** JSON Schema for dictionary module config. */
export const ConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiBase: { type: 'string', default: '/api/dict' },
    mountSelector: { type: 'string', default: '#qmf-dictionary' },
  },
};
