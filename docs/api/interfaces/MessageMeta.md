[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: MessageMeta

Defined in: [src/runner.ts:42](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L42)

Payload of a [MESSAGE\_META\_EVENT](../variables/MESSAGE_META_EVENT.md) `CUSTOM` event.

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [src/runner.ts:48](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L48)

Wall-clock time the run accepted the message, epoch milliseconds.

***

### messageId

> **messageId**: `string`

Defined in: [src/runner.ts:44](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L44)

Id of the input message this metadata describes.

***

### references?

> `optional` **references?**: `unknown`[]

Defined in: [src/runner.ts:53](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L53)

The `state.kaboo_references` the message was sent with, attached to the
newest user message of the run. Absent when none were staged.

***

### role

> **role**: `string`

Defined in: [src/runner.ts:46](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L46)

Role of that message (currently always `"user"`).
