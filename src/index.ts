// pattern: Imperative Shell

import { WebComponent } from '@substrate-system/web-component'
import Debug from '@substrate-system/debug'
import {
    getKeyboardResizeDelta,
    getResizeDimensions,
    normalizeMinimumDimension
} from './resize-math.js'

const debug = Debug('image-editor')

declare global {
    interface HTMLElementTagNameMap {
        'image-editor': ImageEditor
    }
}

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

type ResizeState = {
    readonly corner:ResizeCorner
    readonly freeForm:boolean
    readonly start:{ width:number; height:number }
    readonly startX:number
    readonly startY:number
    readonly pointerId:number
    readonly handle:HTMLElement
}

type KeyboardResizeState = {
    readonly corner:ResizeCorner
    readonly freeForm:boolean
    readonly start:{ width:number; height:number }
    readonly startStyle:{ width:string; height:string }
    readonly deltaX:number
    readonly deltaY:number
    readonly dimensions:{ width:number; height:number }
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

type AltDetail = {
    readonly alt:string
    readonly img:HTMLImageElement
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const EDIT_ICON_PATH = 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0 -3-3L5 17v3z'

export class ImageEditor extends WebComponent.create('image-editor') {
    static reflectedBooleanAttributes = ['free-form']
    static reflectedStringAttributes = ['min-width', 'min-height']

    get freeForm ():boolean {
        return this.hasAttribute('free-form')
    }

    set freeForm (value:boolean) {
        this.toggleAttribute('free-form', Boolean(value))
    }

    get minWidth ():number {
        return getMinimumDimension(this.getAttribute('min-width'))
    }

    set minWidth (value:number) {
        this.setAttribute('min-width', String(value))
    }

    get minHeight ():number {
        return getMinimumDimension(this.getAttribute('min-height'))
    }

    set minHeight (value:number) {
        this.setAttribute('min-height', String(value))
    }

    #image:HTMLImageElement|null = null
    #altObserver:MutationObserver|null = null
    #resizeFrame:number|null = null
    #resizeDimensions:{ width:number; height:number }|null = null
    #resizeState:ResizeState|null = null
    #keyboardResizeState:KeyboardResizeState|null = null

    connectedCallback () {
        if (!this.#image) this.#image = this.querySelector('img')
        if (!this.#image) debug('warning: no child image found')
        super.connectedCallback()
        this.observeAltAttribute()
    }

    render () {
        if (!this.#image) {
            this.innerHTML = ''
            return
        }
        const container = document.createElement('div')
        container.className = 'image-editor-container'
        container.append(this.#image)
        container.append(createEditOverlay(this, this.#image))
        container.append(...createResizeHandles(this))
        this.replaceChildren(container)
    }

    disconnectedCallback () {
        this.#altObserver?.disconnect()
        this.#altObserver = null
        this.cancelResizeFrame()
        this.#resizeState = null
        this.#keyboardResizeState = null
    }

    handlePointerDown = (event:PointerEvent):void => {
        if (!this.#image) return
        const handle = event.currentTarget as HTMLElement
        const corner = getResizeCorner(handle)
        if (!corner) return
        const dimensions = getImageDimensions(this.#image)

        this.#resizeState = {
            corner,
            freeForm: this.freeForm,
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

    handleKeyDown = (event:KeyboardEvent):void => {
        if (!this.#image) return
        const handle = event.currentTarget as HTMLElement
        const corner = getResizeCorner(handle)
        if (!corner) return
        if (event.key === 'Escape') {
            if (this.#keyboardResizeState?.handle !== handle) return
            event.preventDefault()
            this.restoreKeyboardResize()
            return
        }
        if (!isKeyboardResizeKey(event.key)) return

        event.preventDefault()
        const delta = getKeyboardResizeDelta(event.key, event.shiftKey)
        const current = this.#keyboardResizeState
        const state = current?.handle === handle
            ? current
            : createKeyboardResizeState(this.#image, this.freeForm,
                corner, handle)
        if (!current || current.handle !== handle) {
            this.#keyboardResizeState = state
            this.emit('resize-start')
        }

        const nextState = {
            ...state,
            deltaX: state.deltaX + delta.x,
            deltaY: state.deltaY + delta.y
        }
        const dimensions = getResizeDimensions({
            corner: nextState.corner,
            start: nextState.start,
            freeForm: nextState.freeForm,
            minWidth: this.minWidth,
            minHeight: this.minHeight,
            clientX: nextState.deltaX,
            clientY: nextState.deltaY,
            startX: 0,
            startY: 0
        })
        this.#keyboardResizeState = { ...nextState, dimensions }
        this.#image.style.width = `${dimensions.width}px`
        this.#image.style.height = `${dimensions.height}px`
        this.emit('resize', { detail: dimensions })
    }

    handleKeyUp = async (event:KeyboardEvent):Promise<void> => {
        const state = this.#keyboardResizeState
        if (!state || state.handle !== event.currentTarget ||
            !isKeyboardResizeKey(event.key)) {
            return
        }
        await this.finishKeyboardResize(state)
    }

    handlePointerMove = (event:PointerEvent):void => {
        const state = this.#resizeState
        if (!state || state.pointerId !== event.pointerId || !this.#image) {
            return
        }

        this.#resizeDimensions = getResizeDimensions({
            corner: state.corner,
            start: state.start,
            freeForm: state.freeForm,
            minWidth: this.minWidth,
            minHeight: this.minHeight,
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

    handleAlt = (event:MouseEvent):void => {
        event.preventDefault()
        if (!this.#image) return
        this.emit<AltDetail>('alt', {
            detail: {
                alt: getImageAlt(this.#image),
                img: this.#image
            }
        })
    }

    private cancelResizeFrame ():void {
        if (this.#resizeFrame !== null) {
            cancelAnimationFrame(this.#resizeFrame)
            this.#resizeFrame = null
        }
    }

    private restoreKeyboardResize ():void {
        const state = this.#keyboardResizeState
        if (!state || !this.#image) return
        this.#image.style.width = state.startStyle.width
        this.#image.style.height = state.startStyle.height
        this.#keyboardResizeState = null
    }

    private async finishKeyboardResize (
        state:KeyboardResizeState
    ):Promise<void> {
        if (this.#keyboardResizeState !== state || !this.#image) return
        this.#keyboardResizeState = null
        const blob = await createResizeBlob(this.#image, state.dimensions)
        if (!blob) return
        this.emit<ResizeBlobDetail>('resize-end', {
            detail: {
                blob,
                ...state.dimensions
            }
        })
    }

    private observeAltAttribute ():void {
        this.#altObserver?.disconnect()
        if (!this.#image) return
        const image = this.#image
        const badge = this.querySelector<HTMLButtonElement>('button.alt')
        if (!badge) return
        this.#altObserver = new MutationObserver(() => {
            updateAltBadge(badge, image)
        })
        this.#altObserver.observe(image, {
            attributes: true,
            attributeFilter: ['alt']
        })
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
        handle.tabIndex = 0
        handle.setAttribute('aria-label', `Resize from ${corner} corner`)
        handle.style.cursor = cursor
        handle.addEventListener('pointerdown', editor.handlePointerDown)
        handle.addEventListener('pointermove', editor.handlePointerMove)
        handle.addEventListener('pointerup', editor.handlePointerUp)
        handle.addEventListener('pointercancel', editor.handlePointerUp)
        handle.addEventListener('keydown', editor.handleKeyDown)
        handle.addEventListener('keyup', editor.handleKeyUp)
        return handle
    })
}

function createEditOverlay (
    editor:ImageEditor,
    image:HTMLImageElement
):HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'image-editor-overlay'

    const altButton = document.createElement('button')
    altButton.type = 'button'
    altButton.className = 'alt'
    altButton.setAttribute('aria-label', 'Edit alternative text')
    updateAltBadge(altButton, image)
    altButton.addEventListener('click', editor.handleAlt)

    const controls = document.createElement('div')
    controls.className = 'image-editor-controls'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'icon edit'
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
    overlay.append(altButton, controls)
    return overlay
}

function getImageAlt (image:HTMLImageElement):string {
    return image.getAttribute('alt') ?? ''
}

function updateAltBadge (
    button:HTMLButtonElement,
    image:HTMLImageElement
):void {
    button.textContent = getImageAlt(image) ? 'ALT' : '+ALT'
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

function createKeyboardResizeState (
    image:HTMLImageElement,
    freeForm:boolean,
    corner:ResizeCorner,
    handle:HTMLElement
):KeyboardResizeState {
    const start = getImageDimensions(image)
    return {
        corner,
        freeForm,
        start,
        startStyle: {
            width: image.style.width,
            height: image.style.height
        },
        deltaX: 0,
        deltaY: 0,
        dimensions: start,
        handle
    }
}

function isKeyboardResizeKey (
    key:string
):key is 'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'ArrowLeft' {
    return key === 'ArrowUp' || key === 'ArrowRight' ||
        key === 'ArrowDown' || key === 'ArrowLeft'
}

function getMinimumDimension (value:string|null):number {
    const dimension = Number(value)
    return normalizeMinimumDimension(dimension)
}

ImageEditor.define()
