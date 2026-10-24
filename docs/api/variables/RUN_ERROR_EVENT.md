[**@pgege/kaboo-runtime**](../README.md)

***

# Variable: RUN\_ERROR\_EVENT

> `const` **RUN\_ERROR\_EVENT**: `"kaboo.run_error"` = `"kaboo.run_error"`

Defined in: [src/replay.ts:9](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/replay.ts#L9)

Name of the `CUSTOM` event a replay puts where a run failed, carrying the
failure's `{ message, code }`: the run itself replays as stopped, so this is
how a client can still say why it ended.
