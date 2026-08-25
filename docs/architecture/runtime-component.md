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
    ├── img     the first authored image
    ├── span.image-editor-handle.top-left
    ├── span.image-editor-handle.top-right
    ├── span.image-editor-handle.bottom-left
    └── span.image-editor-handle.bottom-right
```

The container has `position: relative` and an always-visible dashed outline.
Each handle is absolutely positioned at a container corner. Diagonal cursor
values communicate the resize direction in both the stylesheet and the
rendered handle style, while CSS custom properties control the handle and
outline appearance. With no image, the element has no rendered children.

Each handle listens for pointer events. A pointerdown records the image's
rendered dimensions and pointer position, captures the pointer, and emits the
namespaced `image-editor:resize-start` event. Pointer movement keeps the
image's aspect ratio, updates inline `width` and `height`, and coalesces the
namespaced `image-editor:resize` event to one emission per animation frame.
On pointerup, the final dimensions are rendered to an offscreen canvas. The
component prefers `createImageBitmap(image)` as the draw source and falls
back to the captured image element when bitmap creation is unavailable or
fails. A `Blob` produced by `canvas.toBlob()` is emitted in the
`image-editor:resize-end` detail with the final width and height.

## DOM and styling boundaries

The component renders in light DOM and does not attach a shadow root.
`src/index.css` imports the global image-editor custom-property defaults from
`src/_vars.css` and hides the undefined element with `:not(:defined)`. The
theme contract currently includes handle size, handle colors, outline
appearance, button size, and overlay padding. The example uses a page-level
FOUCE guard.

## Events

The base class supplies namespaced event helpers. US-004 adds
`image-editor:resize-start` and `image-editor:resize`. US-005 adds
`image-editor:resize-end` with `{ blob, width, height }` detail. Resize event
dimensions are CSS pixels, and the blob canvas uses those same pixel
dimensions. Resize interaction is pointer-based and uses pointer capture
when the browser has an active pointer.
