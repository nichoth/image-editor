# Architecture inventory

This inventory describes the current runtime in this repository. The
authoritative sources are:

- [The component implementation](../../src/index.ts)
- [The stylesheet](../../src/index.css)
- [The package manifest](../../package.json)
- [The browser example](../../example/index.ts)

The repository currently contains a vanilla custom element scaffold. The
image-editing behaviour described in `tasks/` and `specs/` is not part of the
runtime inventory until it is implemented.

## Categories

- [Runtime component](runtime-component.md): element, lifecycle, DOM, and
  host contract.
- [Runtime state](runtime-state.md): DOM-backed and private state; no
  persistence.
- [Distribution](distribution.md): build outputs, package exports, and
  consumers.

## Related decisions

The implementation choices recorded here are explained in the
[architecture decision record index](../adr/INDEX.md). In particular:

- [ADR-001](../adr/ADR-001-web-component-base-class.md) defines the base class.
- [ADR-002](../adr/ADR-002-idempotent-registration.md) defines registration.
- [ADR-003](../adr/ADR-003-light-dom.md) defines rendering and styling scope.
- [ADR-004](../adr/ADR-004-attributes-as-state.md) defines attributes.
- [ADR-005](../adr/ADR-005-namespaced-events.md) defines event helpers.
- [ADR-006](../adr/ADR-006-fouce-mitigation.md) defines FOUCE handling.
- [ADR-007](../adr/ADR-007-dual-format-distribution.md) defines packaging.
- [ADR-008](../adr/ADR-008-browser-tests.md) defines browser testing.
