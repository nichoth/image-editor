# Image-editor button style

## Goal

Match the image-editor overlay controls to the visual treatment used by the
sibling `image-input` package. The controls should read as overlay chrome
against arbitrary image content, while preserving their existing markup,
events, labels, and dimensions.

## Scope

- Update only the image-editor overlay button styling and its custom-property
  defaults.
- Keep the current `ALT`/`+ALT` text behavior and pencil SVG unchanged.
- Keep the resize handles, image outline, and component behavior unchanged.
- Keep the existing example changes and image asset out of this change.

## Selected approach

Use image-editor-scoped root custom properties that mirror the sibling
package's overlay tokens. The stylesheet will apply them to both overlay
buttons:

- dark translucent background with a darker hover state;
- white foreground text and icon;
- subtle translucent light border;
- compact `2rem` control height and width for the pencil button;
- the existing `ALT` badge padding and text sizing preserved;
- a blue `:focus-visible` outline with a small offset;
- the SVG sized independently at `1.125rem`, matching image-input.

This keeps image-editor independently consumable instead of depending on
image-input's CSS, while making the two components visually consistent. The
component's existing button selectors remain the public styling seam, so
consumers can override the custom properties without new markup contracts.

## Alternatives considered

1. Import image-input's CSS directly. This gives exact reuse, but couples two
   packages and brings unrelated image-input rules into image-editor.
2. Add literal values directly to `index.css`. This is smaller initially,
   but breaks the repository convention that colors are custom properties and
   makes consumer theming harder.
3. Add image-editor-specific overlay tokens, selected above. This adds a few
   variables but keeps the package standalone and follows the sibling's
   established design language.

## Verification

- Run the CSS build so Lightning CSS validates the stylesheet.
- Run the existing test suite to confirm the button markup and events remain
  unchanged.
- Run lint and inspect the example at the local Vite URL for hover, keyboard
  focus, and visual contrast over the image.

