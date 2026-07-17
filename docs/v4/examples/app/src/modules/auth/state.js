import { createModuleStore } from '@qmf/runtime';

export const StateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ready', 'userId', 'tier', 'error'],
  properties: {
    ready: { type: 'boolean' },
    userId: { type: ['string', 'null'] },
    tier: {
      type: ['string', 'null'],
      enum: ['free', 'basic', 'pro', 'premium', 'admin', null],
    },
    error: { type: ['string', 'null'] },
  },
};

export const initialState = {
  ready: false,
  userId: null,
  tier: null,
  error: null,
};

export function createAuthStore() {
  return createModuleStore('auth', initialState, StateSchema);
}
