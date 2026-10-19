[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: MessageMeta

Defined in: [src/runner.ts:48](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L48)

Payload of a [MESSAGE\_META\_EVENT](../variables/MESSAGE_META_EVENT.md) `CUSTOM` event.

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [src/runner.ts:54](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L54)

Wall-clock time the run accepted the message, epoch milliseconds.

***

### messageId

> **messageId**: `string`

Defined in: [src/runner.ts:50](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L50)

Id of the input message this metadata describes.

***

### references?

> `optional` **references?**: `unknown`[]

Defined in: [src/runner.ts:59](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L59)

The `state.kaboo_references` the message was sent with, attached to the
newest user message of the run. Absent when none were staged.

***

### role

> **role**: `string`

Defined in: [src/runner.ts:52](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L52)

Role of that message (currently always `"user"`).
