# Runtime state

Authoritative sources are:

- [The component implementation](../../src/index.ts)
- [The package manifest](../../package.json)

## State inventory

- **Captured image:** The first authored `HTMLImageElement`, held by the
  private `ImageEditor.#image` field for the element instance.
- **ALT observer:** A private `MutationObserver` watches the captured image's
  `alt` attribute while the element is connected.
- **Rendered content:** Light-DOM nodes under `image-editor`, owned by the
  element and replaced by `render()`. A rendered image container also owns four
  corner resize-handle elements and an overlay containing the ALT and edit
  buttons.
- **Resize interaction:** Private pointer state stores the active corner,
  pointer identifier, starting pointer position, starting dimensions, the
  resize mode, and handle. A pending animation-frame identifier coalesces
  resize events.
- **Keyboard resize interaction:** Private keyboard state stores the active
  corner, captured resize mode, starting dimensions and inline styles, the
  accumulated keyboard delta, final dimensions, and handle.
- **Resize mode:** The reflected `free-form` boolean attribute is exposed as
  the `freeForm` property. Its value is captured at pointerdown, so a mode
  change applies to the next drag without changing an active drag.
- **Minimum dimensions:** The reflected `min-width` and `min-height` string
  attributes are exposed as numeric `minWidth` and `minHeight` properties.
  Missing, non-positive, or non-finite values resolve to the 50px default at
  the component boundary before the values enter resize math.
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
- Connecting creates an `alt` observer after rendering; disconnecting removes
  the observer so later image mutations do not update detached controls.
- Pointerdown starts a resize from a corner and captures its pointer.
- Pointermove computes proportional dimensions from the initial image size,
  unless the captured resize mode is free-form, in which case each axis is
  computed independently. Both modes apply the configured minimum dimensions.
  It writes dimensions to the image's inline styles and emits a
  frame-coalesced resize event.
- Pointerup, pointercancel, or disconnection clears the active resize state.
  A completed pointerup emits resize-end after canvas.toBlob() returns a
  non-null blob, and closes any bitmap used for drawing.
- The first arrow key on a focused handle starts a keyboard transaction.
  Arrow keys accumulate 10px steps, or 50px with Shift, through the same
  constrained resize math. Keyup commits the dimensions through the canvas
  blob path and emits resize-end. Escape restores the starting inline styles
  and clears the transaction without emitting resize-end.
- Clicking the edit button prevents native button behavior and emits a
  cancelable edit event with the captured image. The component does not create
  an editing dialog.
- Clicking the ALT badge prevents native button behavior and emits a
  cancelable alt event with the current attribute value and captured image.
