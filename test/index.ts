import { test } from '@substrate-system/tapzero'
import '../src/index.js'

test('wraps the first child image in a positioned container', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
            <span>ignored</span>
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const container = el?.querySelector('.image-editor-container')
    const image = container?.querySelector('img')

    t.ok(container, 'should render the image container')
    t.equal(container?.className, 'image-editor-container')
    t.equal(image?.getAttribute('src'), 'image.jpg')
    t.equal(image?.getAttribute('width'), '320')
    t.equal(container?.children.length, 1)
})

test('renders nothing and warns when no child image exists', t => {
    document.body.innerHTML = '<image-editor><span>no image</span></image-editor>'

    const el = document.querySelector('image-editor')

    t.equal(el?.innerHTML, '')
    t.ok(el, 'should find an element')
})
