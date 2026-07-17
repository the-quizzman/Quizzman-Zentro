/**
 * @typedef {Object} AuthConfig
 * @property {string} loginUrl
 * @property {string} [accountUrl]
 * @property {string} [apiEndpoint]
 * @property {boolean} [showTierBadge]
 */

/** JSON Schema for module config (runtime-validated). */
export const ConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['loginUrl'],
  properties: {
    loginUrl: { type: 'string', format: 'uri' },
    accountUrl: { type: 'string', format: 'uri' },
    apiEndpoint: { type: 'string', default: '/api/auth/me' },
    showTierBadge: { type: 'boolean', default: true },
  },
};
