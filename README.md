# @substrate-system/image-editor

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

A light-DOM web component for resizing an image in the browser. It provides
corner handles, keyboard resizing, an edit action, and an ALT-text action.
The component owns the interaction UI; your application owns the edit and
ALT-text dialogs or other follow-up behavior.

[See the live demo][demo-link].

[npm-badge]: https://img.shields.io/npm/v/@substrate-system/image-editor
[npm-link]: https://www.npmjs.com/package/@substrate-system/image-editor
[license-badge]: https://img.shields.io/badge/license-Big_Time-blue
[license-link]: ./LICENSE
[demo-link]: https://nichoth.github.io/image-editor/

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [API](#api)
  - [JavaScript API](#javascript-api)
  - [Attributes](#attributes)
  - [Events](#events)
- [Styling](#styling)
  - [CSS custom properties](#css-custom-properties)
  - [Avoiding undefined-content flash](#avoiding-undefined-content-flash)
- [Pre-built files](#pre-built-files)
- [Development](#development)

## Install

```sh
npm install @substrate-system/image-editor
```

## Quick start

Import the element and its stylesheet from your application entry point.
The module calls `window.customElements.define`, so you can just import
then use the tag in your HTML.

```js
import '@substrate-system/image-editor'
import '@substrate-system/image-editor/css'
```

Put one image inside the element.

```html
<image-editor>
    <img
        src="/images/cinnamon-roll.jpg"
        width="640"
        height="480"
        alt="A cinnamon roll"
    >
</image-editor>
```

The element captures the first `img` descendant when it connects. It replaces
its light-DOM children with the rendered editor UI. If no image is present,
the element renders no children and writes a warning to the `image-editor`
debug namespace.

## How it works

- Drag any corner handle to resize the image.
- Resizing preserves the aspect ratio by default.
- Add `free-form` to resize width and height independently.
- The default minimum size is 50 by 50 pixels.
- Focus a corner handle and use the arrow keys for keyboard resizing.
- The `ALT` or `+ALT` button emits an event for your ALT-text UI.
- The pencil button emits an event for your image-editing UI.
- Completed resizes can produce a canvas-generated `Blob`.

The resize handles use pointer events and pointer capture, so a drag can
continue if the pointer leaves the handle. The four handles are focusable and
have corner-specific ARIA labels.

## API

### JavaScript API

The package exports the `ImageEditor` class and registers the
`image-editor` custom element when imported.

#### ESM

```js
import { ImageEditor } from '@substrate-system/image-editor'
```

#### CommonJS

```js
const { ImageEditor } = require('@substrate-system/image-editor')
```

This extends [web-component](https://github.com/mycelial-systems/web-component),
so it has `ImageEditor.TAG`, `ImageEditor.event('edit')`,
and `on()` and `off()` methods.

```js
const editor = document.querySelector('image-editor')

editor.on('edit', event => {
    console.log(event.detail.img)
})
```

You can use `addEventListener()` with the full namespaced event names shown in
the [Events](#events) section.

### Attributes

All attributes are reflected on the element. Kebab-case numeric attributes
also have typed camel-case properties.

#### `free-form`

Boolean attribute. It is absent by default. When present, each resize axis is
constrained independently instead of preserving the image aspect ratio.

```html
<image-editor free-form>
    <img src="/images/example.jpg" width="320" height="240" alt="Example">
</image-editor>
```

The equivalent property is `editor.freeForm`:

```js
editor.freeForm = true
editor.freeForm = false
```

The resize mode is captured when a pointer or keyboard resize starts. A mode
change therefore applies to the next interaction.

#### `min-width` and `min-height`

Positive minimum dimensions in CSS pixels. Both default to `50`.

```html
<image-editor min-width="120" min-height="90">
    <img src="/images/example.jpg" width="320" height="240" alt="Example">
</image-editor>
```

The typed properties are `editor.minWidth` and `editor.minHeight`:

```js
editor.minWidth = 120
editor.minHeight = 90
```

Missing, non-positive, non-finite, or otherwise invalid values resolve to the
50-pixel default when read. In aspect-ratio mode, both minimums are honored
without distorting the image. In `free-form` mode, each axis is clamped
independently.

#### `visible`

Controls when the resize outline and handles are disclosed. Accepted values
are:

- `always` keeps the outline and handles visible.
- `hover` hides the handles until the editor is hovered or focused.
- `touch` keeps them visible on touch devices and uses hover disclosure on
  other devices.

The default is `touch`. Missing or unsupported values also resolve to `touch`.

```html
<image-editor visible="hover">
    <img src="/images/example.jpg" width="320" height="240" alt="Example">
</image-editor>
```

The typed property is `editor.visible`:

```js
editor.visible = 'always'
```

Changing the attribute or property updates an already-rendered editor.

### Events

Events bubble from the element, are cancelable, and use the
`image-editor:<name>` naming convention. The examples below use the native
event API.

#### `image-editor:resize-start`

Emitted when a pointer resize begins or when the first arrow key starts a
keyboard resize sequence. The event has no detail payload.

```js
editor.addEventListener('image-editor:resize-start', () => {
    console.log('resize started')
})
```

#### `image-editor:resize`

Emitted with the current dimensions. Keyboard resizing emits this event for
each arrow-key change. Pointer resizing emits it once after a dragged pointer
is released.

The detail contains rounded CSS-pixel dimensions:

```js
editor.addEventListener('image-editor:resize', event => {
    const { width, height, blob } = event.detail
    console.log(width, height)

    if (blob) {
        // A canvas-generated Blob is available when canvas conversion worked.
        upload(blob)
    }
})
```

For pointer resizing, `blob` may be included in the detail after the canvas
conversion completes. If canvas conversion cannot produce a blob, the detail
still contains `width` and `height`.

#### `image-editor:resize-end`

Emitted when a keyboard resize sequence is committed on keyup and canvas
conversion returns a blob. Its detail is always:

```js
{
    blob: Blob,
    width: number,
    height: number
}
```

The blob is drawn at the same pixel dimensions reported in the detail. For
images loaded from another origin, configure CORS on the image response and
use an appropriate `crossorigin` value before loading the image if your
application needs blob output.

#### `image-editor:edit`

Emitted when the pencil button is clicked. The event is cancelable and its
detail contains the captured image element:

```js
editor.addEventListener('image-editor:edit', event => {
    const image = event.detail.img
    openImageEditor(image)
})
```

The component does not open a dialog or modify the image for you.

#### `image-editor:alt`

Emitted when the ALT badge is clicked. The event is cancelable and its detail
contains the current `alt` value and the captured image:

```js
editor.addEventListener('image-editor:alt', event => {
    const { alt, img } = event.detail
    openAltTextEditor({ alt, img })
})
```

An absent `alt` attribute is reported as an empty string. The badge displays
`+ALT` for an absent or empty value and `ALT` for a non-empty value. It updates
when the image's `alt` attribute changes.

#### Keyboard resizing

After a handle receives focus:

- Arrow keys change the size by 10 pixels.
- Shift plus an arrow key changes the size by 50 pixels.
- `Escape` restores the inline width and height from before the sequence.
- Releasing an arrow key commits the current keyboard resize sequence.

Keyboard resizing uses the same aspect-ratio and minimum-size rules as pointer
resizing. `Escape` cancels the sequence and does not produce a resize-end
event.

## Styling

The component renders in the light DOM. Import the package stylesheet to get
the outline, controls, handles, and undefined-element guard:

```js
import '@substrate-system/image-editor/css'
```

The minified stylesheet is available at:

```js
import '@substrate-system/image-editor/min/css'
```

### CSS custom properties

Defaults are defined globally on `:root`. Override them after importing the
package stylesheet:

```css
:root {
    --image-editor-outline-color: rebeccapurple;
    --image-editor-handle-bg: white;
    --image-editor-button-bg: rgb(0 0 0 / 65%);
}
```

Available properties are:

- `--image-editor-outline-color`: visible outline color; default `black`.
- `--image-editor-outline-hidden-color`: hidden outline color; default
  `transparent`.
- `--image-editor-outline-width`: outline width; default `2px`.
- `--image-editor-outline-style`: outline style; default `dashed`.
- `--image-editor-handle-size`: square handle size; default `10px`.
- `--image-editor-handle-bg`: handle fill color; default `white`.
- `--image-editor-handle-border`: handle border color; default `black`.
- `--image-editor-handle-border-width`: handle border width; default `1px`.
- `--image-editor-button-size`: button height and icon-button width; default
  `2rem`.
- `--image-editor-button-icon-size`: pencil icon size; default `1.125rem`.
- `--image-editor-button-bg`: button background; default 65% black.
- `--image-editor-button-bg-hover`: hovered button background; default 80%
  black.
- `--image-editor-button-focus-color`: focus-ring color; default `#1d9bf0`.
- `--image-editor-button-padding`: edit-button padding; default `0`.
- `--image-editor-button-icon-stroke-width`: pencil stroke width; default
  `2px`.
- `--image-editor-overlay-padding`: overlay inset; default `8px`.

### Avoiding undefined-content flash

The stylesheet hides `image-editor` until its custom element definition is
available. If your page has several custom elements, you can also hide the
whole page until they are defined:

```html
<html class="reduce-fouce">
    <head>
        <style>
            html.reduce-fouce { opacity: 0; }
        </style>
        <noscript>
            <style>
                html.reduce-fouce { opacity: 1 !important; }
            </style>
        </noscript>
    </head>
</html>
```

Reveal the page after the definition is ready, with a timeout so a failed
definition cannot leave the page hidden forever:

```js
await Promise.race([
    customElements.whenDefined('image-editor'),
    new Promise(resolve => setTimeout(resolve, 2000))
])

document.documentElement.classList.remove('reduce-fouce')
```

## Pre-built files

The package publishes JavaScript and CSS files in `dist/`:

- `index.js` and `index.min.js` are ESM.
- `index.cjs` and `index.min.cjs` are CommonJS.
- `index.css` and `index.min.css` are the stylesheets.

If your application does not bundle npm packages, copy the minified files to
a directory served by your web server:

```sh
cp node_modules/@substrate-system/image-editor/dist/index.min.js public/
cp node_modules/@substrate-system/image-editor/dist/index.min.css public/
```

Then load the stylesheet and module in HTML:

```html
<link rel="stylesheet" href="/index.min.css">
<script type="module" src="/index.min.js"></script>
```

## Development

Install dependencies and start the Vite example app:

```sh
npm install
npm start
```

The example app runs on port `2222` by default. Useful project commands are:

```sh
npm test          # Run browser tests
npm run lint      # Run ESLint
npm run build     # Build JavaScript and CSS artifacts
```

The package build writes publishable artifacts to `dist/`. The example build
uses `npm run build-example` and writes its output to `public/`.
