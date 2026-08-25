This is a vanilla web component. It inherits from
`@substrate-system/web-component`.

Reflected attributes use the exact HTML attribute name in
`static reflectedBooleanAttributes`. For kebab-case attributes, add a typed
camel-case accessor only when the public JavaScript property should be
camelCase, while keeping the attribute as the source of truth.
