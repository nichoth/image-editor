import { WebComponent } from '@substrate-system/web-component'
import { withWildcards } from '@substrate-system/web-component/wildcard'
import Debug from '@substrate-system/debug'
import {
    getKeyboardResizeDelta,
    getResizeDimensions,
    normalizeMinimumDimension
} from './resize-math.js'
import {
    normalizeResizeVisibility,
    shouldHideResizeAffordance,
    type ResizeVisibility
} from './resize-visibility.js'

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

export class ImageEditor extends withWildcards(
    WebComponent.create('image-editor')
) {
    static reflectedBooleanAttributes = ['free-form']
    static reflectedStringAttributes = [
        'min-width', 'min-height', 'visible'
    ]

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

    get visible ():ResizeVisibility {
        return normalizeResizeVisibility(this.getAttribute('visible'))
    }

    set visible (value:ResizeVisibility) {
        this.setAttribute('visible', value)
    }

    private _image:HTMLImageElement|null = null
    private _altObserver:MutationObserver|null = null
    private _resizeDimensions:{ width:number; height:number }|null = null
    private _resizeState:ResizeState|null = null
    private _keyboardResizeState:KeyboardResizeState|null = null

    connectedCallback () {
        if (!this._image) this._image = this.querySelector('img')
        if (!this._image) debug('warning: no child image found')
        super.connectedCallback()
        this.observeAltAttribute()
    }

    render () {
        if (!this._image) {
            this.innerHTML = ''
            return
        }
        const container = document.createElement('div')
        container.className = 'image-editor-container'
        updateResizeVisibility(container, this.visible, isTouchDevice())
        container.append(this._image)
        container.append(createEditOverlay(this, this._image))
        container.append(...createResizeHandles(this))
        this.replaceChildren(container)
    }

    handleChange_visible = ():void => {
        const container = this.querySelector('.image-editor-container')
        if (!(container instanceof HTMLElement)) return
        updateResizeVisibility(container, this.visible, isTouchDevice())
    }

    disconnectedCallback () {
        this._altObserver?.disconnect()
        this._altObserver = null
        this._resizeState = null
        this._keyboardResizeState = null
    }

    handlePointerDown = (event:PointerEvent):void => {
        if (!this._image) return
        const handle = event.currentTarget as HTMLElement
        const corner = getResizeCorner(handle)
        if (!corner) return
        const dimensions = getImageDimensions(this._image)

        this._resizeState = {
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
        if (!this._image) return
        const handle = event.currentTarget as HTMLElement
        const corner = getResizeCorner(handle)
        if (!corner) return
        if (event.key === 'Escape') {
            if (this._keyboardResizeState?.handle !== handle) return
            event.preventDefault()
            this.restoreKeyboardResize()
            return
        }
        if (!isKeyboardResizeKey(event.key)) return

        event.preventDefault()
        const delta = getKeyboardResizeDelta(event.key, event.shiftKey)
        const current = this._keyboardResizeState
        const state = current?.handle === handle
            ? current
            : createKeyboardResizeState(this._image, this.freeForm,
                corner, handle)
        if (!current || current.handle !== handle) {
            this._keyboardResizeState = state
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
        this._keyboardResizeState = { ...nextState, dimensions }
        this._image.style.width = `${dimensions.width}px`
        this._image.style.height = `${dimensions.height}px`
        this.emit('resize', { detail: dimensions })
    }

    handleKeyUp = async (event:KeyboardEvent):Promise<void> => {
        const state = this._keyboardResizeState
        if (!state || state.handle !== event.currentTarget ||
            !isKeyboardResizeKey(event.key)) {
            return
        }
        await this.finishKeyboardResize(state)
    }

    handlePointerMove = (event:PointerEvent):void => {
        const state = this._resizeState
        if (!state || state.pointerId !== event.pointerId || !this._image) {
            return
        }

        this._resizeDimensions = getResizeDimensions({
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
        this._image.style.width = `${this._resizeDimensions.width}px`
        this._image.style.height = `${this._resizeDimensions.height}px`
    }

    handlePointerUp = async (event:PointerEvent):Promise<void> => {
        const state = this._resizeState
        if (!state || state.pointerId !== event.pointerId) return
        if (state.handle.hasPointerCapture(event.pointerId)) {
            state.handle.releasePointerCapture(event.pointerId)
        }
        const dimensions = this._resizeDimensions
        const finalDimensions = dimensions ?? state.start
        this._resizeState = null
        this._resizeDimensions = null
        const blob = await createResizeBlob(this._image, {
            ...finalDimensions
        })
        if (!dimensions) return
        if (blob) {
            this.emit('resize', {
                detail: {
                    ...dimensions,
                    blob
                }
            })
        } else {
            this.emit('resize', {
                detail: dimensions
            })
        }
    }

    handleEdit = (event:MouseEvent):void => {
        event.preventDefault()
        if (!this._image) return
        this.emit<EditDetail>('edit', { detail: { img: this._image } })
    }

    handleAlt = (event:MouseEvent):void => {
        event.preventDefault()
        if (!this._image) return
        this.emit<AltDetail>('alt', {
            detail: {
                alt: getImageAlt(this._image),
                img: this._image
            }
        })
    }

    private restoreKeyboardResize ():void {
        const state = this._keyboardResizeState
        if (!state || !this._image) return
        this._image.style.width = state.startStyle.width
        this._image.style.height = state.startStyle.height
        this._keyboardResizeState = null
    }

    private async finishKeyboardResize (
        state:KeyboardResizeState
    ):Promise<void> {
        if (this._keyboardResizeState !== state || !this._image) return
        this._keyboardResizeState = null
        const blob = await createResizeBlob(this._image, state.dimensions)
        if (!blob) return
        this.emit<ResizeBlobDetail>('resize-end', {
            detail: {
                blob,
                ...state.dimensions
            }
        })
    }

    private observeAltAttribute ():void {
        this._altObserver?.disconnect()
        if (!this._image) return
        const image = this._image
        const badge = this.querySelector<HTMLButtonElement>('button.alt')
        if (!badge) return
        this._altObserver = new MutationObserver(() => {
            updateAltBadge(badge, image)
        })
        this._altObserver.observe(image, {
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

function updateResizeVisibility (
    container:HTMLElement,
    visibility:ResizeVisibility,
    touchDevice:boolean
):void {
    container.classList.toggle('hide-resize-affordance',
        shouldHideResizeAffordance(visibility, touchDevice))
}

ImageEditor.define()

/**
 * Check to see if this device supports touch.
 * Uses criteria pulled from Modernizr:
 * https://github.com/Modernizr/Modernizr/blob/
 * da22eb27631fc4957f67607fe6042e85c0a84656/
 * feature-detects/touchevents.js#L40
 *
 * @return {boolean} - true if the current device supports touch.
 */
function isTouchDevice () {
    return Boolean(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error old
        (window.DocumentTouch && document instanceof window.DocumentTouch)
    )
}
