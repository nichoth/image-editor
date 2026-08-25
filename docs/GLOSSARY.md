# Glossary

The vocabulary specific to this component. Standard web-component terms
(`connectedCallback`, `observedAttributes`, Shadow DOM, ESM/CJS) are not
defined here -- see
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

## Component

Words used while writing the component itself.

**Change handler** -- A method named `handleChange_<attribute>`, called by
`attributeChangedCallback` when that attribute changes. The dispatch is
by convention, not registration. Declare reflected attributes in
`reflectedBooleanAttributes` or `reflectedStringAttributes`. Extend
`super.observedAttributes` for an observed attribute that does not reflect.
A missing handler is silently skipped. Attribute changes do not re-render
the component.
