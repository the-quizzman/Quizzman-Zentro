/**
 * QMF GraphQL Utilities
 * Helper functions for working with GraphQL
 */

/**
 * Create a simple GraphQL query string
 * @param {string} operation - Operation name (query/mutation)
 * @param {string} fields - Fields to query
 * @param {Object} variables - Variables definition
 * @returns {string}
 */
export function createQuery(operation, fields, variables = {}) {
  const varDefs = Object.keys(variables).length > 0
    ? `(${Object.entries(variables).map(([key, type]) => `$${key}: ${type}`).join(', ')})`
    : '';
  
  return `query ${operation}${varDefs} { ${operation}${varDefs ? `(${Object.keys(variables).map(k => `${k}: $${k}`).join(', ')})` : ''} ${fields} }`;
}

/**
 * Create a GraphQL mutation
 * @param {string} operation - Mutation name
 * @param {string} fields - Fields to return
 * @param {Object} variables - Variables definition
 * @returns {string}
 */
export function createMutation(operation, fields, variables = {}) {
  const varDefs = Object.keys(variables).length > 0
    ? `(${Object.entries(variables).map(([key, type]) => `$${key}: ${type}`).join(', ')})`
    : '';
  
  return `mutation ${operation}${varDefs} { ${operation}${varDefs ? `(${Object.keys(variables).map(k => `${k}: $${k}`).join(', ')})` : ''} ${fields} }`;
}

/**
 * GraphQL query builder
 */
export class QueryBuilder {
  constructor(type = 'query') {
    this.type = type;
    this.operations = [];
    this.variables = {};
  }

  /**
   * Add an operation
   * @param {string} name - Operation name
   * @param {Object} args - Arguments
   * @param {string} fields - Fields to query
   */
  add(name, args = {}, fields = '') {
    this.operations.push({ name, args, fields });
    return this;
  }

  /**
   * Add variable definition
   * @param {string} name - Variable name
   * @param {string} type - Variable type
   */
  var(name, type) {
    this.variables[name] = type;
    return this;
  }

  /**
   * Build the query string
   */
  build() {
    const varDefs = Object.keys(this.variables).length > 0
      ? `(${Object.entries(this.variables).map(([key, type]) => `$${key}: ${type}`).join(', ')})`
      : '';

    const ops = this.operations.map(op => {
      const args = Object.keys(op.args).length > 0
        ? `(${Object.entries(op.args).map(([key, val]) => `${key}: ${val}`).join(', ')})`
        : '';
      return `${op.name}${args} ${op.fields}`;
    }).join(' ');

    return `${this.type}${varDefs} { ${ops} }`;
  }
}

export default {
  createQuery,
  createMutation,
  QueryBuilder
};
