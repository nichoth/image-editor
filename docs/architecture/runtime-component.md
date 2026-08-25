# Runtime component

Authoritative sources are:

- [The element class](../../src/index.ts)
- [The stylesheet](../../src/index.css)
- [The browser example](../../example/index.ts)
- [The base-class decision](../adr/ADR-001-web-component-base-class.md)

## Component map

- **Tag:** `image-editor`
- **Owner:** `ImageEditor` in `src/index.ts`
- **Entry point:** Import `src/index.ts` or the package root.
- **Contract:** A self-registering element backed by
  `WebComponent.create('image-editor')`.

`ImageEditor` is exported and registered through the base class's idempotent
path. The tag is registered in `HTMLElementTagNameMap`.

## Registration and lifecycle

On connection, the element captures the first authored `img` before calling
`super.connectedCallback()`, which invokes `render()`. If no image exists,
rendering is empty and a warning is sent to the `image-editor` debug namespace.
The captured image is retained across reconnection.

## Rendered DOM and state interface

With an image, rendering produces:

```text
image-editor
└── div.image-editor-container
    └── img     the first authored image
```

The container has `position: relative` for future overlay controls. With no
image, the element has no rendered children.

## DOM and styling boundaries

The component renders in light DOM and does not attach a shadow root.
`src/index.css` imports the global image-editor custom-property defaults from
`src/_vars.css` and hides the undefined element with `:not(:defined)`. The
theme contract currently includes handle size, handle colors, outline
appearance, button size, and overlay padding. The example uses a page-level
FOUCE guard.

## Events

The base class supplies namespaced event helpers. No component-specific event
is emitted by this story.
