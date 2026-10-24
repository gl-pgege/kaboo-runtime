[**@pgege/kaboo-runtime**](../README.md)

***

# Class: StateOwnership

Defined in: [src/keys.ts:47](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L47)

Applies a [KabooStateKeys](../interfaces/KabooStateKeys.md) split to the state a run starts with and to what the browser sees.

## Constructors

### Constructor

> **new StateOwnership**(`keys?`): `StateOwnership`

Defined in: [src/keys.ts:51](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L51)

#### Parameters

##### keys?

[`KabooStateKeys`](../interfaces/KabooStateKeys.md) = `DEFAULT_STATE_KEYS`

#### Returns

`StateOwnership`

## Methods

### merge()

> **merge**(`persisted`, `client`, `host?`): [`ThreadState`](../type-aliases/ThreadState.md)

Defined in: [src/keys.ts:61](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L61)

The state a run starts with: the browser's keys from the client (the
stored value when the client sent none), the server's keys from the store
only, then whatever the host set for this run.

#### Parameters

##### persisted

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`

##### client

`unknown`

##### host?

[`ThreadState`](../type-aliases/ThreadState.md) = `{}`

#### Returns

[`ThreadState`](../type-aliases/ThreadState.md)

***

### visible()

> **visible**(`event`): `BaseEvent` \| `null`

Defined in: [src/keys.ts:83](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L83)

The copy of an event the browser may see, or `null` when none of it is
visible. Only state events can carry hidden keys.

#### Parameters

##### event

`BaseEvent`

#### Returns

`BaseEvent` \| `null`

***

### visibleState()

> **visibleState**(`state`): [`ThreadState`](../type-aliases/ThreadState.md) \| `null`

Defined in: [src/keys.ts:73](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L73)

Strip the hidden keys from a state value.

#### Parameters

##### state

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`

#### Returns

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`
