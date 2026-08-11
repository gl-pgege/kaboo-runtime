[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: MessageMeta

Defined in: [src/runner.ts:24](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L24)

Payload of a [MESSAGE\_META\_EVENT](../variables/MESSAGE_META_EVENT.md) `CUSTOM` event.

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [src/runner.ts:30](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L30)

Wall-clock time the run accepted the message, epoch milliseconds.

***

### messageId

> **messageId**: `string`

Defined in: [src/runner.ts:26](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L26)

Id of the input message this metadata describes.

***

### references?

> `optional` **references?**: `unknown`[]

Defined in: [src/runner.ts:35](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L35)

The `state.kaboo_references` the message was sent with, attached to the
newest user message of the run. Absent when none were staged.

***

### role

> **role**: `string`

Defined in: [src/runner.ts:28](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L28)

Role of that message (currently always `"user"`).
