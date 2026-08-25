# Runtime component

Authoritative sources are:

- [The element class](../../src/index.ts)
- [The stylesheet](../../src/index.css)
- [The browser example](../../example/index.ts)
- [The base-class decision](../adr/ADR-001-web-component-base-class.md)

## Component map

The runtime component is:

- **Tag:** `image-editor`
- **Owner:** `Example` in `src/index.ts`
- **Entry point:** Import `src/index.ts` or the package root.
- **Contract:** A self-registering custom element backed by
  `WebComponent.create('image-editor')`.

`Example` is exported for consumers that need its static event helper or
TypeScript type. The tag name is also registered in
`HTMLElementTagNameMap` for `document.querySelector` typing.

## Registration and lifecycle

Importing `src/index.ts` has a registration side effect. `Example.define()`
registers `image-editor` through the base class's idempotent path, so repeated
imports do not throw. The first implementation registered for the tag wins.

When connected, the element captures the authored light-DOM children as
serialized `outerHTML` strings, calls the base `connectedCallback()` to render,
and starts a `MutationObserver` for added child nodes. The observer only logs
through the debug namespace `image-editor`.

When disconnected, the observer is disconnected and cleared. The subclass
must retain the call to `super.connectedCallback()`; the base callback is what
invokes `render()`.

## Rendered DOM and state interface

Rendering replaces the element's contents with this structure:

```text
image-editor
└── div
    ├── p       text from the `example` attribute, or "example"
    └── ul
        └── li  one item for each authored child
```

The `example` string attribute is reflected to the `example` property by the
base class. Its change handler updates the rendered paragraph in place and
does not re-render the component. An attribute change can arrive before the
first connection, so the handler tolerates a missing paragraph.

The component does not currently expose image resize controls, canvas state,
editing events, or an image-specific public API. Those belong to the planned
feature described outside the runtime source.

## DOM and styling boundaries

The component renders in light DOM by assigning `innerHTML`; it does not
attach a shadow root. Authored children are preserved as markup in the first
render, but later renders use the captured strings rather than live nodes.

`src/index.css` hides the undefined element with `:not(:defined)` and applies
the current component background. The example adds a page-level FOUCE guard,
waits for `customElements.whenDefined('image-editor')`, and reveals the page
after definition or a two-second timeout. A `noscript` fallback reveals the
page when JavaScript is disabled.

## Events

The base class supplies namespaced `emit`, `on`, `off`, and static `event`
helpers. No component-specific event is emitted by the current scaffold.
Consumers must not infer the future `image-editor:*` event set from the
planned requirements; it is not implemented here.
