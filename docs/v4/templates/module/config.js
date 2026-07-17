/** JSON Schema config for sample */
export const ConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
  },
};
