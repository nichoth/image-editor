This is a vanilla web component. It inherits from
`@substrate-system/web-component`.

Reflected attributes use the exact HTML attribute name in
`static reflectedBooleanAttributes`. For kebab-case attributes, add a typed
camel-case accessor only when the public JavaScript property should be
camelCase, while keeping the attribute as the source of truth.

Numeric kebab-case attributes use `static reflectedStringAttributes` for
observation and a typed camel-case accessor that parses and validates the
attribute value on read.

Keyboard resize interactions capture their starting dimensions, inline styles,
and resize mode in private state; reuse `resize-math.ts` for keyboard deltas so
keyboard and pointer constraints stay consistent.
