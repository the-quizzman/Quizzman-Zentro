/**
 * QMF GraphQL Module
 * GraphQL client and utilities for frontend services
 * @version 1.0.0
 */

export { default as GraphQLClient, createGraphQLClient, notiGraphQL, chatGraphQL, classGraphQL } from './client.js';
export { createQuery, createMutation, QueryBuilder } from './utils.js';

// Re-export for convenience
import { notiGraphQL, chatGraphQL, classGraphQL } from './client.js';

export const graphql = {
  noti: notiGraphQL,
  chat: chatGraphQL,
  class: classGraphQL
};

export default graphql;
