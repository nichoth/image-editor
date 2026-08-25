import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import '../src/index.js'

test('example test', async t => {
    document.body.innerHTML += `
        <image-editor class="test">
        </image-editor>
    `

    const el = await waitFor('image-editor')

    t.ok(el, 'should find an element')
})
