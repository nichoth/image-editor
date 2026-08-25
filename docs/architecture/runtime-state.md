# Runtime state

Authoritative sources are [the component implementation](../../src/index.ts),
[the package manifest](../../package.json), and [the base-class attribute
decision](../adr/ADR-004-attributes-as-state.md).

## State inventory

| State | Shape | Owner | Lifetime | Persistence |
| --- | --- | --- | --- | --- |
| `example` | `string \| null` reflected attribute/property | `Example` and the host markup | While the element exists | None |
| Authored children | `string[]` of serialized `outerHTML` | Private `Example.#slotted` field | From first connection until the element instance is discarded | None |
| Child-list observer | `MutationObserver \| null` | Private `Example.#observer` field | Connected lifetime only | None |
| Rendered content | Light-DOM nodes under `image-editor` | The element | Replaced by `render()` | None |

There are no KV, database, object-store, cache, or server-side state writes
in the current runtime. The package is a client-side custom element and has
no recovery or backup contract for component state.

## State transitions

- Before the first render, authored children are captured from the connected
  element. This is intentionally done in `connectedCallback()` because parser
  construction does not guarantee that children exist in the constructor.
- `super.connectedCallback()` renders the current attribute value and replaces
  the element's light-DOM children.
- Later `example` changes update the existing paragraph through
  `handleChange_example`; they do not replace the rendered subtree.
- Disconnecting stops observation but retains the instance's captured child
  strings. A later reconnect therefore reuses the original authored markup.

The explicit absence of persistent state is part of the current contract.
Future image editing state must define its owner, lifetime, and event or
attribute boundary before it is added to this inventory.
