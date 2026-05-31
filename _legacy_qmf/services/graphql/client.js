/**
 * QMF GraphQL Client
 * Simple GraphQL client for services without heavy dependencies
 * @version 1.0.0
 */

import { authService } from '../auth/index.js';

/**
 * GraphQL Client
 */
class GraphQLClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Execute GraphQL query
   * @param {string} query - GraphQL query string
   * @param {Object} variables - Query variables
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async query(query, variables = {}, options = {}) {
    try {
      const token = authService.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('[GraphQL] Errors:', result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL error');
      }

      return result.data;
    } catch (error) {
      console.error('[GraphQL] Request failed:', error);
      throw error;
    }
  }

  /**
   * Execute GraphQL mutation (alias for query)
   */
  async mutate(mutation, variables = {}, options = {}) {
    return this.query(mutation, variables, options);
  }
}

/**
 * Create GraphQL client for a service
 * @param {string} serviceUrl - Base service URL
 * @returns {GraphQLClient}
 */
export function createGraphQLClient(serviceUrl) {
  const endpoint = `${serviceUrl}/graphql`;
  return new GraphQLClient(endpoint);
}

/**
 * Service-specific clients
 */
export const notiGraphQL = createGraphQLClient('https://noti.quizzman.com');
export const chatGraphQL = createGraphQLClient('https://chat.quizzman.com');
export const classGraphQL = createGraphQLClient('https://class.quizzman.com');

export default GraphQLClient;
