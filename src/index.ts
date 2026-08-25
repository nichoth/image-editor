// pattern: Imperative Shell

import { WebComponent } from '@substrate-system/web-component'
import Debug from '@substrate-system/debug'
import { getResizeDimensions } from './resize-math.js'

const debug = Debug('image-editor')

declare global {
    interface HTMLElementTagNameMap {
        'image-editor': ImageEditor
    }
}

type ResizeCorner = 'top-left' | 'top-right' |
    'bottom-left' | 'bottom-right'

type ResizeState = {
    readonly corner:ResizeCorner
    readonly start:{ width:number; height:number }
    readonly startX:number
    readonly startY:number
    readonly pointerId:number
    readonly handle:HTMLElement
}

type ResizeBlobDetail = {
    readonly blob:Blob
    readonly width:number
    readonly height:number
}

type EditDetail = {
    readonly img:HTMLImageElement
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const EDIT_ICON_PATH =
    'M4 20h4L18.5 9.5a2.1 2.1 0 0 0 -3-3L5 17v3z'

export class ImageEditor extends WebComponent.create('image-editor') {
    #image:HTMLImageElement|null = null
    #resizeFrame:number|null = null
    #resizeDimensions:{ width:number; height:number }|null = null
    #resizeState:ResizeState|null = null

    connectedCallback () {
        if (!this.#image) this.#image = this.querySelector('img')
        if (!this.#image) debug('warning: no child image found')
        super.connectedCallback()
    }

    render () {
        if (!this.#image) {
            this.innerHTML = ''
            return
        }
        const container = document.createElement('div')
        container.className = 'image-editor-container'
        container.append(this.#image)
        container.append(createEditOverlay(this))
        container.append(...createResizeHandles(this))
        this.replaceChildren(container)
    }

    disconnectedCallback () {
        this.cancelResizeFrame()
        this.#resizeState = null
    }

    handlePointerDown = (event:PointerEvent):void => {
        if (!this.#image) return
        const handle = event.currentTarget as HTMLElement
        const corner = getResizeCorner(handle)
        if (!corner) return
        const dimensions = getImageDimensions(this.#image)

        this.#resizeState = {
            corner,
            start: dimensions,
            startX: event.clientX,
            startY: event.clientY,
            pointerId: event.pointerId,
            handle
        }
        try {
            handle.setPointerCapture(event.pointerId)
        } catch (error) {
            if (!(error instanceof DOMException) ||
                error.name !== 'NotFoundError') {
                throw error
            }
        }
        this.emit('resize-start')
    }

    handlePointerMove = (event:PointerEvent):void => {
        const state = this.#resizeState
        if (!state || state.pointerId !== event.pointerId || !this.#image) {
            return
        }

        this.#resizeDimensions = getResizeDimensions({
            corner: state.corner,
            start: state.start,
            clientX: event.clientX,
            clientY: event.clientY,
            startX: state.startX,
            startY: state.startY
        })
        this.#image.style.width = `${this.#resizeDimensions.width}px`
        this.#image.style.height = `${this.#resizeDimensions.height}px`
        if (this.#resizeFrame === null) {
            this.#resizeFrame = requestAnimationFrame(() => {
                this.#resizeFrame = null
                this.emit('resize', { detail: this.#resizeDimensions })
            })
        }
    }

    handlePointerUp = async (event:PointerEvent):Promise<void> => {
        const state = this.#resizeState
        if (!state || state.pointerId !== event.pointerId) return
        this.cancelResizeFrame()
        if (state.handle.hasPointerCapture(event.pointerId)) {
            state.handle.releasePointerCapture(event.pointerId)
        }
        const dimensions = this.#resizeDimensions ?? state.start
        this.#resizeState = null
        this.#resizeDimensions = null
        const blob = await createResizeBlob(this.#image, dimensions)
        if (!blob) return
        this.emit<ResizeBlobDetail>('resize-end', {
            detail: {
                blob,
                ...dimensions
            }
        })
    }

    handleEdit = (event:MouseEvent):void => {
        event.preventDefault()
        if (!this.#image) return
        this.emit<EditDetail>('edit', { detail: { img: this.#image } })
    }

    private cancelResizeFrame ():void {
        if (this.#resizeFrame !== null) {
            cancelAnimationFrame(this.#resizeFrame)
            this.#resizeFrame = null
        }
    }
}

async function createResizeBlob (
    image:HTMLImageElement|null,
    dimensions:{ readonly width:number; readonly height:number }
):Promise<Blob|null> {
    if (!image || !Number.isFinite(dimensions.width) ||
        !Number.isFinite(dimensions.height) || dimensions.width <= 0 ||
        dimensions.height <= 0) {
        return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')
    if (!context) return null

    let source:CanvasImageSource = image
    let bitmap:ImageBitmap|null = null
    if (typeof globalThis.createImageBitmap === 'function') {
        try {
            bitmap = await globalThis.createImageBitmap(image)
            source = bitmap
        } catch (_) {
            bitmap = null
        }
    }

    try {
        context.drawImage(source, 0, 0, dimensions.width, dimensions.height)
        return await canvasToBlob(canvas)
    } finally {
        bitmap?.close()
    }
}

function canvasToBlob (canvas:HTMLCanvasElement):Promise<Blob|null> {
    return new Promise(resolve => {
        canvas.toBlob(resolve)
    })
}

function createResizeHandles (editor:ImageEditor) {
    const corners = [
        ['top-left', 'nwse-resize'],
        ['top-right', 'nesw-resize'],
        ['bottom-left', 'nesw-resize'],
        ['bottom-right', 'nwse-resize']
    ]

    return corners.map(([corner, cursor]) => {
        const handle = document.createElement('span')
        handle.className = `image-editor-handle ${corner}`
        handle.style.cursor = cursor
        handle.addEventListener('pointerdown', editor.handlePointerDown)
        handle.addEventListener('pointermove', editor.handlePointerMove)
        handle.addEventListener('pointerup', editor.handlePointerUp)
        handle.addEventListener('pointercancel', editor.handlePointerUp)
        return handle
    })
}

function createEditOverlay (editor:ImageEditor):HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'image-editor-overlay'

    const controls = document.createElement('div')
    controls.className = 'image-editor-controls'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'edit'
    button.setAttribute('aria-label', 'Edit image')
    button.addEventListener('click', editor.handleEdit)

    const icon = document.createElementNS(SVG_NAMESPACE, 'svg')
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS(SVG_NAMESPACE, 'path')
    path.setAttribute('d', EDIT_ICON_PATH)
    icon.append(path)
    button.append(icon)
    controls.append(button)
    overlay.append(controls)
    return overlay
}

function getResizeCorner (handle:HTMLElement):ResizeCorner|null {
    const corners:Array<ResizeCorner> = [
        'top-left', 'top-right', 'bottom-left', 'bottom-right'
    ]
    return corners.find(corner => handle.classList.contains(corner)) ?? null
}

function getImageDimensions (image:HTMLImageElement) {
    const rect = image.getBoundingClientRect()
    const width = rect.width || image.width || image.naturalWidth
    const height = rect.height || image.height || image.naturalHeight
    return { width, height }
}

ImageEditor.define()
