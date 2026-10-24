**@pgege/kaboo-runtime**

***

# @pgege/kaboo-runtime

## Classes

- [InMemoryGrantStore](classes/InMemoryGrantStore.md)
- [InMemoryThreadStore](classes/InMemoryThreadStore.md)
- [KabooAgentRunner](classes/KabooAgentRunner.md)
- [KabooHttpAgent](classes/KabooHttpAgent.md)
- [PostgresGrantStore](classes/PostgresGrantStore.md)
- [PostgresThreadStore](classes/PostgresThreadStore.md)
- [StateOwnership](classes/StateOwnership.md)

## Interfaces

- [ApprovalDecision](interfaces/ApprovalDecision.md)
- [ApprovalSubject](interfaces/ApprovalSubject.md)
- [GrantQuery](interfaces/GrantQuery.md)
- [GrantStore](interfaces/GrantStore.md)
- [KabooAccessPolicy](interfaces/KabooAccessPolicy.md)
- [KabooApprovalOptions](interfaces/KabooApprovalOptions.md)
- [KabooEnrichment](interfaces/KabooEnrichment.md)
- [KabooRunContext](interfaces/KabooRunContext.md)
- [KabooRunnerOptions](interfaces/KabooRunnerOptions.md)
- [KabooStateKeys](interfaces/KabooStateKeys.md)
- [ListThreadsFilter](interfaces/ListThreadsFilter.md)
- [MessageMeta](interfaces/MessageMeta.md)
- [PostgresGrantStoreOptions](interfaces/PostgresGrantStoreOptions.md)
- [PostgresThreadStoreOptions](interfaces/PostgresThreadStoreOptions.md)
- [StoredThread](interfaces/StoredThread.md)
- [ThreadStore](interfaces/ThreadStore.md)
- [ToolGrant](interfaces/ToolGrant.md)

## Type Aliases

- [ApprovalScope](type-aliases/ApprovalScope.md)
- [NewToolGrant](type-aliases/NewToolGrant.md)
- [ThreadState](type-aliases/ThreadState.md)

## Variables

- [DEFAULT\_STATE\_KEYS](variables/DEFAULT_STATE_KEYS.md)
- [KABOO\_GRANTS\_PROP](variables/KABOO_GRANTS_PROP.md)
- [MESSAGE\_META\_EVENT](variables/MESSAGE_META_EVENT.md)
- [RUN\_ERROR\_EVENT](variables/RUN_ERROR_EVENT.md)

## Functions

- [applyStateDelta](functions/applyStateDelta.md)
- [compactRunEvents](functions/compactRunEvents.md)
- [createKabooRunner](functions/createKabooRunner.md)
- [deriveState](functions/deriveState.md)
- [finishedRunBounds](functions/finishedRunBounds.md)
- [replayableLog](functions/replayableLog.md)
- [resolveApprovalDecisions](functions/resolveApprovalDecisions.md)
