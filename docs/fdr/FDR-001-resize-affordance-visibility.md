# FDR-001: Resize affordance visibility

**Status:** Active
**Last reviewed:** 2026-08-25

## Overview

The image editor lets consumers choose when its resize outline and corner
handles appear. This keeps desktop images uncluttered while keeping the
resize controls available on touch devices.

## Behavior

- The `visible` attribute accepts `hover`, `always`, or `touch`.
- The default is `touch`.
- With `always`, the resize outline and corner handles remain visible.
- With `hover`, the outline and handles stay hidden until the editor is
  hovered. Focusing a resize handle also reveals them for keyboard users.
- With `touch`, the outline and handles remain visible on touch devices.
  On devices without touch support, they stay hidden until the editor is
  hovered.
- Missing or unsupported values use the `touch` behavior.
- Changing `visible` updates an already-rendered editor.

## Design decisions

### 1. Use a reflected string attribute

**Decision:** `visible` is the public configuration value and is reflected
between markup and the JavaScript property.

**Why:** Consumers can configure the component in HTML, through a framework,
or at runtime with one source of truth. This follows [ADR-004][adr-004].

**Tradeoff:** Invalid strings cannot be represented by the TypeScript union,
so runtime values need a defined fallback.

### 2. Make touch the default

**Decision:** The default keeps resize controls visible on touch devices and
uses hover disclosure on devices without touch support.

**Why:** Touch users have no hover gesture to reveal a hidden control.
Desktop users can keep the image presentation clean until they approach it.

**Tradeoff:** A device that supports both touch and a pointing device gets
the touch behavior and keeps the controls visible.

### 3. Reveal focused controls

**Decision:** Keyboard focus reveals the hidden outline and handles as well
as pointer hover.

**Why:** A hidden keyboard target is difficult to discover and undermines
the component's existing keyboard resize support.

**Tradeoff:** Focused controls can appear without pointer hover, which makes
the visibility rule slightly less strict in favor of keyboard access.

## Related

- **ADRs:** [ADR-004][adr-004]
- **FDRs:** None

[adr-004]: ../adr/ADR-004-attributes-as-state.md
