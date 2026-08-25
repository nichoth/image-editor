# Runtime state

Authoritative sources are:

- [The component implementation](../../src/index.ts)
- [The package manifest](../../package.json)
- [The base-class attribute decision](../adr/ADR-004-attributes-as-state.md)

## State inventory

- **`example`:** A `string | null` reflected attribute and property owned by
  `Example` and host markup. It lasts while the element exists and is not
  persisted.
- **Authored children:** A `string[]` of serialized `outerHTML` values held by
  the private `Example.#slotted` field. It lasts for the element instance and
  is not persisted.
- **Child-list observer:** A `MutationObserver | null` held by the private
  `Example.#observer` field. It exists only while the element is connected.
- **Rendered content:** Light-DOM nodes under `image-editor`, owned by the
  element and replaced by `render()`. It is not persisted.

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
