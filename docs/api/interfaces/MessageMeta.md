[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: MessageMeta

Defined in: [src/runner.ts:41](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L41)

Payload of a [MESSAGE\_META\_EVENT](../variables/MESSAGE_META_EVENT.md) `CUSTOM` event.

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [src/runner.ts:47](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L47)

Wall-clock time the run accepted the message, epoch milliseconds.

***

### messageId

> **messageId**: `string`

Defined in: [src/runner.ts:43](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L43)

Id of the input message this metadata describes.

***

### references?

> `optional` **references?**: `unknown`[]

Defined in: [src/runner.ts:52](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L52)

The `state.kaboo_references` the message was sent with, attached to the
newest user message of the run. Absent when none were staged.

***

### role

> **role**: `string`

Defined in: [src/runner.ts:45](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L45)

Role of that message (currently always `"user"`).
