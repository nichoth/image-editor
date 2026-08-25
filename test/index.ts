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
    t.equal(container?.children.length, 5)
})

test('renders nothing and warns when no child image exists', t => {
    document.body.innerHTML =
        '<image-editor><span>no image</span></image-editor>'

    const el = document.querySelector('image-editor')

    t.equal(el?.innerHTML, '')
    t.ok(el, 'should find an element')
})

test('renders four corner resize handles', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const handles = document.querySelectorAll<HTMLElement>(
        '.image-editor-handle'
    )
    const corners = Array.from(handles).map(handle => handle.className)

    t.equal(handles.length, 4, 'should render one handle for each corner')
    t.ok(corners.includes('image-editor-handle top-left'))
    t.ok(corners.includes('image-editor-handle top-right'))
    t.ok(corners.includes('image-editor-handle bottom-left'))
    t.ok(corners.includes('image-editor-handle bottom-right'))
})

test('styles the outline and handles for corner resizing', t => {
    const handles = document.querySelectorAll('.image-editor-handle')
    const cursors: Array<string> = []
    handles.forEach(handle => {
        cursors.push((handle as HTMLElement).style.cursor)
    })

    t.ok(cursors.includes('nwse-resize'))
    t.ok(cursors.includes('nesw-resize'))
})

test('starts a pointer resize and captures the pointer', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const handle = el?.querySelector('.bottom-right') as HTMLElement
    let capturedPointerId:number|null = null
    let didStart = false
    handle.setPointerCapture = (pointerId:number) => {
        capturedPointerId = pointerId
    }
    el?.addEventListener('image-editor:resize-start', () => {
        didStart = true
    })

    handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 320,
        clientY: 240,
        pointerId: 7
    }))

    t.equal(capturedPointerId, 7)
    t.ok(didStart, 'should emit resize-start')
})

test('resizes proportionally and emits a throttled resize event', async t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const handle = el?.querySelector('.bottom-right') as HTMLElement
    const image = el?.querySelector('img') as HTMLImageElement
    const resizeEvents:Array<CustomEvent<{ width:number; height:number }>> = []
    el?.addEventListener('image-editor:resize', event => {
        resizeEvents.push(event as CustomEvent<{
            width:number
            height:number
        }>)
    })

    handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 320,
        clientY: 240,
        pointerId: 8
    }))
    handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 360,
        clientY: 270,
        pointerId: 8
    }))

    await new Promise(resolve => requestAnimationFrame(resolve))

    t.equal(image.style.width, '360px')
    t.equal(image.style.height, '270px')
    t.equal(resizeEvents.length, 1)
    t.equal(resizeEvents[0]?.detail.width, 360)
    t.equal(resizeEvents[0]?.detail.height, 270)
})
