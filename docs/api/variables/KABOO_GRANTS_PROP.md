[**@pgege/kaboo-runtime**](../README.md)

***

# Variable: KABOO\_GRANTS\_PROP

> `const` **KABOO\_GRANTS\_PROP**: `"kaboo_grants"` = `"kaboo_grants"`

Defined in: [src/approvals.ts:8](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L8)

`forwardedProps` key carrying the decisions the host remembers, read by
kaboo-workflows' tool gate. The runner always replaces a client-sent value,
so only the host can grant a permission.
