# ADR-007: Ship ESM and CJS, keep compiled output out of git

**Date:** 2026-07-28

## Context

Consumers resolve packages differently. A bundler wants ESM, a Node
script may still `require()`, and a plain `<script type="module">` wants
a pre-bundled minified file. Publishing one format forces the others to
work around it.

Separately, compiled output in git makes every build produce a diff and
every merge produce a conflict, over files nobody reads.

## Decision

Build JavaScript in four forms: CJS (`.cjs`), minified CJS (`.min.cjs`),
ESM (`.js`) with `.d.ts` declarations, and bundled minified ESM
(`.min.js`). Compile CSS as `index.css` and `index.min.css`. `esbuild`
builds the JavaScript, `tsc --emitDeclarationOnly` emits declarations,
and `lightningcss` builds the CSS.

Route consumers with the `exports` field. The package root selects ESM or
CJS, and `./css`, `./min/css`, `./min/*`, and `./*` expose the other
artifacts. Every advertised JavaScript format has a matching build step.

`dist` is in `.gitignore` and explicitly included by `.npmignore`. The
`files` field limits published build artifacts to `./dist/*`. npm also
includes its standard metadata files. Compiled code reaches npm and does
not enter git.

The npm lifecycle hooks enforce the sequence:

- `preversion` runs `eslint` and `stylelint`
- `version` regenerates the README TOC and the changelog, and stages them
- `postversion` pushes with tags and publishes
- `prepublishOnly` runs the build

## Consequences

`npm version` performs a full release: lint, document, tag, push, build,
and publish. There is no separate release script to remember. The package
manifest does not mark the package private, so the publish hook can run.

A fresh clone has no `dist`, so anything reading from it fails until
`npm run build` runs. Tests avoid this by importing from `src`.

The four JavaScript forms and two CSS forms can drift from `exports`. The
build must produce every target that the manifest advertises.
