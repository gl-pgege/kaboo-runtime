[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooApprovalOptions

Defined in: [src/approvals.ts:122](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L122)

Options for remembered approvals — see [KabooRunnerOptions.approvals](KabooRunnerOptions.md#approvals).

## Properties

### grants?

> `optional` **grants?**: [`GrantStore`](GrantStore.md)

Defined in: [src/approvals.ts:130](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L130)

Where remembered decisions live. When set (and the thread has an owner),
the runner saves "allow for this chat" and "always allow" answers and
hands every run the owner's permissions, which is also what tells the
agent it may offer those scopes. Omit it to offer only "approve once".
Decisions on requests a tool raised itself are never saved here.

***

### onDecision?

> `optional` **onDecision?**: (`decisions`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [src/approvals.ts:139](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L139)

Called with the person's decisions before the run continues, after
grants are saved — for audit, or to register approvals with a service
that enforces them. A decision with a `request` came from a tool that
enforces its own approvals: forward it to that tool's service, and only
to it. If this throws, the run ends with an error and the requests stay
pending.

#### Parameters

##### decisions

[`ApprovalDecision`](ApprovalDecision.md)[]

##### context

[`KabooRunContext`](KabooRunContext.md)

#### Returns

`void` \| `Promise`\<`void`\>
