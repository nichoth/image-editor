# Runtime state

Authoritative sources are:

- [The component implementation](../../src/index.ts)
- [The package manifest](../../package.json)

## State inventory

- **Captured image:** The first authored `HTMLImageElement`, held by the
  private `ImageEditor.#image` field for the element instance.
- **Rendered content:** Light-DOM nodes under `image-editor`, owned by the
  element and replaced by `render()`. A rendered image container also owns four
  corner resize-handle elements.
- **Resize interaction:** Private pointer state stores the active corner,
  pointer identifier, starting pointer position, starting dimensions, and
  handle. A pending animation-frame identifier coalesces resize events.
- **Resize output:** Pointerup creates a transient offscreen canvas and
  resolves a blob from either an image bitmap or the captured image element.

There are no server-side state writes. This is a client-side custom element.

## State transitions

- The first image is captured in `connectedCallback()` before rendering,
  because parser construction does not guarantee children in the constructor.
- `super.connectedCallback()` replaces light-DOM children with the image
  container and its four corner handles.
- If no image was captured, rendering clears the light DOM and logs a warning.
- Disconnecting retains the captured image for later reconnection.
- Pointerdown starts a resize from a corner and captures its pointer.
- Pointermove computes proportional dimensions from the initial image size,
  writes them to the image's inline styles, and emits a frame-coalesced resize
  event.
- Pointerup, pointercancel, or disconnection clears the active resize state.
  A completed pointerup emits resize-end after canvas.toBlob() returns a
  non-null blob, and closes any bitmap used for drawing.
