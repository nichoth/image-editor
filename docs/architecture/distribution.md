# Distribution

Authoritative sources are [the package manifest](../../package.json), [the
build configuration](../../tsconfig.build.json), [the source entry point](../../src/index.ts),
and [the distribution decision](../adr/ADR-007-dual-format-distribution.md).

## Package contract

The package is private in the current manifest and is named
`@substrate-system/image-editor`. Its published-file rule is `dist/*`; the
generated directory is ignored by git and created by `npm run build`.

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
- `build-esm` emits non-bundled ESM files, a metafile, source maps, and
  declaration files.
- `build-esm:min` emits bundled minified ESM files and source maps.
- `build-css` and `build-css:min` compile the stylesheet with Lightning CSS.

`npm run build-example` builds the Vite browser example into `public/`. The
example imports source files directly; tests also import from `src/` and do
not require a prior package build.

## Runtime dependencies and known drift

`@substrate-system/web-component` is a production dependency because the
source extends its `WebComponent` base class. `@substrate-system/debug` is
imported by the runtime source but is currently listed only in
`devDependencies`. The non-bundled ESM and CommonJS builds therefore require
this dependency to be available to consumers; this is a package-manifest
issue outside the documentation-only inventory change.

The `./min/*` export advertises a minified CommonJS target, but the current
scripts only define a minified ESM build. Treat the minified CommonJS path as
unverified until a corresponding build output exists.
