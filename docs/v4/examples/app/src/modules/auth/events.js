import { defineEvent } from '@qmf/events';

export const AuthSessionChangedPayload = {
  type: 'object',
  additionalProperties: false,
  required: ['userId', 'tier'],
  properties: {
    userId: { type: ['string', 'null'] },
    tier: {
      type: ['string', 'null'],
      enum: ['free', 'basic', 'pro', 'premium', 'admin', null],
    },
  },
};

export const AuthSessionChanged = defineEvent({
  name: 'auth.session.changed',
  namespace: 'auth',
  version: 1,
  description: 'Emitted when user session becomes available or cleared.',
  payload: AuthSessionChangedPayload,
  producers: ['auth'],
  consumers: ['dictionary'],
});
