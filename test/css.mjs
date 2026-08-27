// pattern: Imperative Shell

import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

assert.equal(packageJson.exports['./css'], './dist/index.css')

const cssFiles = ['dist/index.css', 'dist/index.min.css']

for (const cssFile of cssFiles) {
    const css = await readFile(cssFile, 'utf8')

    assert.doesNotMatch(css, /@import/,
        `${cssFile} should not contain CSS imports`)
    assert.match(css, /--image-editor-outline-color/,
        `${cssFile} should contain the library variables`)
}
