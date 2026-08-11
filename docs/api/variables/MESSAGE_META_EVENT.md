[**@pgege/kaboo-runtime**](../README.md)

***

# Variable: MESSAGE\_META\_EVENT

> `const` **MESSAGE\_META\_EVENT**: `"kaboo.message_meta"` = `"kaboo.message_meta"`

Defined in: [src/runner.ts:21](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L21)

Name of the `CUSTOM` event the runner emits (and persists) once per new
input message of a run, carrying `{ messageId, role, createdAt, references }`.
Because events are persisted verbatim and replayed on reconnect, this is the
durable channel for message timestamps and per-message references — the
derived `Message` snapshot cannot be relied on to round-trip extra fields.
