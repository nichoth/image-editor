# Distribution

Authoritative sources are:

- [The package manifest](../../package.json)
- [The build configuration](../../tsconfig.build.json)
- [The source entry point](../../src/index.ts)
- [The distribution decision](../adr/ADR-007-dual-format-distribution.md)

## Package contract

The package is named `@substrate-system/image-editor`. Its published-file
rule is `dist/*`; the generated directory is ignored by git and created by
`npm run build`. The manifest does not mark the package private.

The package root is an import side effect that defines `image-editor`:

```js
import '@substrate-system/image-editor'
```

The package also declares a CommonJS root, CSS subpaths, and wildcard JS
subpaths in `package.json`:

| Export | Target |
| --- | --- |
| `.` import | `dist/index.js` |
| `.` require | `dist/index.cjs` |
| `./css` | `dist/index.css` |
| `./min/css` | `dist/index.min.css` |
| `./min/*` | `dist/*.min.js` or `dist/*.min.cjs` |
| `./*` | `dist/*.js` or `dist/*.cjs` |

## Build outputs

`npm run build` clears `dist/` and runs the following production steps:

- `build-cjs` emits non-bundled CommonJS files and source maps.
- `build-cjs:min` emits minified CommonJS files and source maps.
- `build-esm` emits non-bundled ESM files, a metafile, source maps, and
  declaration files.
- `build-esm:min` emits bundled minified ESM files and source maps.
- `build-css` and `build-css:min` bundle all stylesheet imports with Lightning
  CSS, producing self-contained CSS files.

`npm run build-example` builds the Vite browser example into `public/`. The
example imports source files directly; tests also import from `src/` and do
not require a prior package build.

## Runtime dependencies

`@substrate-system/web-component` is a production dependency because the
source extends its `WebComponent` base class. `@substrate-system/debug` is
also a production dependency because `src/index.ts` imports it. The
non-bundled ESM and CommonJS outputs leave both imports for the consumer's
package manager to resolve.

Every target declared by the package root, wildcard JavaScript exports, and
CSS exports has a corresponding build output.
