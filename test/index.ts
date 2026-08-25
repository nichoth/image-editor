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
    t.equal(container?.children.length, 6)
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

test('renders an edit button with the pencil icon and emits edit', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const image = el?.querySelector('img')
    const button = el?.querySelector('button.edit') as HTMLButtonElement
    const path = button?.querySelector('svg path')
    let editImage:HTMLImageElement|null = null
    let wasCancelable = false
    let wasCanceled = false

    el?.addEventListener('image-editor:edit', event => {
        const customEvent = event as CustomEvent<{ img:HTMLImageElement }>
        editImage = customEvent.detail.img
        wasCancelable = customEvent.cancelable
        customEvent.preventDefault()
        wasCanceled = customEvent.defaultPrevented
    })

    t.ok(button, 'should render the edit button')
    if (!button) return
    button.click()

    t.equal(button.type, 'button')
    t.equal(button.getAttribute('aria-label'), 'Edit image')
    t.equal(path?.getAttribute('d'),
        'M4 20h4L18.5 9.5a2.1 2.1 0 0 0 -3-3L5 17v3z')
    t.equal(editImage, image)
    t.ok(wasCancelable, 'should allow consumers to cancel the event')
    t.ok(wasCanceled, 'should respect preventDefault')
    t.equal(el?.querySelector('dialog'), null)
})

test('renders an empty ALT badge and emits alt', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const image = el?.querySelector('img')
    const button = el?.querySelector('button.alt') as HTMLButtonElement
    let altText:string|null = null
    let altImage:HTMLImageElement|null = null
    let wasCancelable = false

    el?.addEventListener('image-editor:alt', event => {
        const customEvent = event as CustomEvent<{
            alt:string
            img:HTMLImageElement
        }>
        altText = customEvent.detail.alt
        altImage = customEvent.detail.img
        wasCancelable = customEvent.cancelable
    })

    t.ok(button, 'should render the ALT badge button')
    if (!button) return
    t.equal(button.textContent, '+ALT')
    t.equal(button.parentElement?.lastElementChild?.className,
        'image-editor-controls')
    button.click()

    t.equal(altText, '')
    t.equal(altImage, image)
    t.ok(wasCancelable, 'should allow consumers to cancel the event')
    t.equal(el?.querySelector('dialog'), null)
})

test('renders ALT for a non-empty image alt attribute', t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const button = document.querySelector(
        'button.alt'
    ) as HTMLButtonElement

    t.equal(button.textContent, 'ALT')
})

test('updates the ALT badge when the image alt attribute changes',
    async t => {
        document.body.innerHTML = `
            <image-editor>
                <img src="image.jpg" width="320" height="240" alt="A test">
            </image-editor>
        `

        const image = document.querySelector('image-editor img')
        const button = document.querySelector(
            'button.alt'
        ) as HTMLButtonElement

        image?.setAttribute('alt', '')
        await Promise.resolve()
        t.equal(button.textContent, '+ALT')

        image?.setAttribute('alt', 'Updated')
        await Promise.resolve()
        t.equal(button.textContent, 'ALT')
    })

test('disconnects the ALT observer when the editor is removed', async t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const image = el?.querySelector('img')
    const button = el?.querySelector('button.alt') as HTMLButtonElement

    el?.remove()
    image?.removeAttribute('alt')
    await Promise.resolve()

    t.equal(button.textContent, 'ALT')
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

test('produces a blob from an image bitmap when resizing ends', async t => {
    document.body.innerHTML = `
        <image-editor>
            <img src="image.jpg" width="320" height="240" alt="A test">
        </image-editor>
    `

    const el = document.querySelector('image-editor')
    const handle = el?.querySelector('.bottom-right') as HTMLElement
    const drawnSources:Array<CanvasImageSource> = []
    const bitmap = { close () {} } as ImageBitmap
    const originalCreateImageBitmap = globalThis.createImageBitmap
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalToBlob = HTMLCanvasElement.prototype.toBlob
    const browser = globalThis as {
        createImageBitmap?: typeof globalThis.createImageBitmap
    }
    let blobWidth = 0
    let blobHeight = 0
    let didCloseBitmap = false
    const blob = new Blob(['resized'])

    browser.createImageBitmap = async () => bitmap
    const mockContext = {
        drawImage (source:CanvasImageSource) {
            drawnSources.push(source)
        }
    } as unknown as CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = (() => mockContext) as unknown as
        typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toBlob = function (callback) {
        blobWidth = this.width
        blobHeight = this.height
        callback(blob)
    }
    bitmap.close = () => {
        didCloseBitmap = true
    }

    const resizeEnds:Array<CustomEvent<{
        blob:Blob
        width:number
        height:number
    }>> = []
    el?.addEventListener('image-editor:resize-end', event => {
        resizeEnds.push(event as CustomEvent<{
            blob:Blob
            width:number
            height:number
        }>)
    })

    handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 320,
        clientY: 240,
        pointerId: 9
    }))
    handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 360,
        clientY: 270,
        pointerId: 9
    }))
    handle.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 360,
        clientY: 270,
        pointerId: 9
    }))

    await new Promise(resolve => setTimeout(resolve, 0))

    t.equal(resizeEnds.length, 1)
    t.equal(resizeEnds[0]?.detail.blob, blob)
    t.equal(resizeEnds[0]?.detail.width, 360)
    t.equal(resizeEnds[0]?.detail.height, 270)
    t.equal(blobWidth, 360)
    t.equal(blobHeight, 270)
    t.equal(drawnSources[0], bitmap)
    t.ok(didCloseBitmap)

    browser.createImageBitmap = originalCreateImageBitmap
    HTMLCanvasElement.prototype.getContext = originalGetContext
    HTMLCanvasElement.prototype.toBlob = originalToBlob
})

test('falls back to drawing the image when bitmap creation is unavailable',
    async t => {
        document.body.innerHTML = `
            <image-editor>
                <img src="image.jpg" width="320" height="240" alt="A test">
            </image-editor>
        `

        const el = document.querySelector('image-editor')
        const handle = el?.querySelector('.bottom-right') as HTMLElement
        const image = el?.querySelector('img') as HTMLImageElement
        const originalCreateImageBitmap = globalThis.createImageBitmap
        const originalGetContext = HTMLCanvasElement.prototype.getContext
        const originalToBlob = HTMLCanvasElement.prototype.toBlob
        const browser = globalThis as {
            createImageBitmap?: typeof globalThis.createImageBitmap
        }
        const drawnSources:Array<CanvasImageSource> = []
        const blob = new Blob(['resized'])
        let blobWidth = 0
        let blobHeight = 0

        browser.createImageBitmap = undefined
        const mockContext = {
            drawImage (source:CanvasImageSource) {
                drawnSources.push(source)
            }
        } as unknown as CanvasRenderingContext2D
        HTMLCanvasElement.prototype.getContext = (() => mockContext) as
            unknown as typeof HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.toBlob = function (callback) {
            blobWidth = this.width
            blobHeight = this.height
            callback(blob)
        }

        const resizeEnds:Array<{
            blob:Blob
            width:number
            height:number
        }> = []
        el?.addEventListener('image-editor:resize-end', event => {
            resizeEnds.push((event as CustomEvent).detail)
        })

        handle.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            clientX: 320,
            clientY: 240,
            pointerId: 10
        }))
        handle.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            clientX: 360,
            clientY: 270,
            pointerId: 10
        }))
        handle.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            clientX: 360,
            clientY: 270,
            pointerId: 10
        }))

        await new Promise(resolve => setTimeout(resolve, 0))

        t.equal(resizeEnds.length, 1)
        t.equal(resizeEnds[0]?.blob, blob)
        t.equal(resizeEnds[0]?.width, 360)
        t.equal(resizeEnds[0]?.height, 270)
        t.equal(blobWidth, 360)
        t.equal(blobHeight, 270)
        t.equal(drawnSources[0], image)

        browser.createImageBitmap = originalCreateImageBitmap
        HTMLCanvasElement.prototype.getContext = originalGetContext
        HTMLCanvasElement.prototype.toBlob = originalToBlob
    })
