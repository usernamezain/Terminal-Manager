/**
 * Safe JSON serializer that handles circular references, Error objects,
 * functions, and DOM/system objects without ever throwing.
 */
export function safeStringify(value: unknown, indent?: number): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
      null,
      indent
    );
  }

  const seen = new WeakSet();

  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);

          // Handle Error objects embedded in properties
          if (val instanceof Error) {
            return {
              name: val.name,
              message: val.message,
              stack: val.stack,
            };
          }
        }
        if (typeof val === 'function') {
          return '[Function]';
        }
        return val;
      },
      indent
    );
  } catch {
    return String(value);
  }
}
