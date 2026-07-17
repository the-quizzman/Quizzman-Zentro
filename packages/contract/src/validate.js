/**
 * Minimal JSON Schema validator for QMF contracts/manifests/events.
 * Supports: type, const, enum, required, properties, additionalProperties,
 * pattern, minLength, maxLength, minimum, maximum, minItems, items,
 * default (applied when validating with { applyDefaults: true }).
 * @param {unknown} schema
 * @param {unknown} data
 * @param {{ applyDefaults?: boolean, path?: string }} [opts]
 * @returns {{ ok: true, data: unknown } | { ok: false, errors: string[] }}
 */
export function validate(schema, data, opts = {}) {
  const errors = [];
  const path = opts.path ?? '$';
  const applyDefaults = opts.applyDefaults === true;

  if (!schema || typeof schema !== 'object') {
    return { ok: true, data };
  }

  /** @type {any} */
  const s = schema;
  let value = data;

  if (s.const !== undefined && value !== s.const) {
    errors.push(`${path}: expected const ${JSON.stringify(s.const)}`);
  }

  if (s.enum && !s.enum.includes(value)) {
    // allow null in enum if listed
    errors.push(`${path}: expected one of ${JSON.stringify(s.enum)}`);
  }

  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const okType = types.some((t) => matchType(t, value));
    if (!okType) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeName(value)}`);
    }
  }

  if (typeof value === 'string') {
    if (s.minLength != null && value.length < s.minLength) {
      errors.push(`${path}: minLength ${s.minLength}`);
    }
    if (s.maxLength != null && value.length > s.maxLength) {
      errors.push(`${path}: maxLength ${s.maxLength}`);
    }
    if (s.pattern) {
      const re = new RegExp(s.pattern);
      if (!re.test(value)) errors.push(`${path}: pattern ${s.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (s.minimum != null && value < s.minimum) errors.push(`${path}: minimum ${s.minimum}`);
    if (s.maximum != null && value > s.maximum) errors.push(`${path}: maximum ${s.maximum}`);
  }

  if (Array.isArray(value)) {
    if (s.minItems != null && value.length < s.minItems) {
      errors.push(`${path}: minItems ${s.minItems}`);
    }
    if (s.items) {
      value.forEach((item, i) => {
        const r = validate(s.items, item, { path: `${path}[${i}]`, applyDefaults });
        if (!r.ok) errors.push(...r.errors);
        else if (applyDefaults) value[i] = r.data;
      });
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    /** @type {Record<string, unknown>} */
    const obj = applyDefaults ? { ...value } : /** @type {any} */ (value);

    if (applyDefaults && s.properties) {
      for (const [key, propSchema] of Object.entries(s.properties)) {
        if (obj[key] === undefined && propSchema && typeof propSchema === 'object' && 'default' in propSchema) {
          obj[key] = /** @type {any} */ (propSchema).default;
        }
      }
    }

    if (Array.isArray(s.required)) {
      for (const key of s.required) {
        if (obj[key] === undefined) errors.push(`${path}: missing required "${key}"`);
      }
    }

    if (s.properties) {
      for (const [key, propSchema] of Object.entries(s.properties)) {
        if (obj[key] === undefined) continue;
        const r = validate(propSchema, obj[key], { path: `${path}.${key}`, applyDefaults });
        if (!r.ok) errors.push(...r.errors);
        else if (applyDefaults) obj[key] = r.data;
      }
    }

    if (s.additionalProperties === false && s.properties) {
      for (const key of Object.keys(obj)) {
        if (!(key in s.properties)) {
          errors.push(`${path}: additional property "${key}" not allowed`);
        }
      }
    }

    value = obj;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: value };
}

/**
 * @param {string} t
 * @param {unknown} v
 */
function matchType(t, v) {
  if (t === 'null') return v === null;
  if (t === 'array') return Array.isArray(v);
  if (t === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
  if (t === 'integer') return typeof v === 'number' && Number.isInteger(v);
  return typeof v === t;
}

/** @param {unknown} v */
function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Validate or throw.
 * @param {unknown} schema
 * @param {unknown} data
 * @param {{ applyDefaults?: boolean, name?: string }} [opts]
 */
export function assertValid(schema, data, opts = {}) {
  const result = validate(schema, data, { applyDefaults: opts.applyDefaults !== false });
  if (!result.ok) {
    const err = new Error(
      `[QMF:validate] ${opts.name ?? 'data'} invalid:\n` + result.errors.map((e) => `  - ${e}`).join('\n'),
    );
    err.name = 'QMFValidationError';
    /** @type {any} */ (err).errors = result.errors;
    throw err;
  }
  return result.data;
}
