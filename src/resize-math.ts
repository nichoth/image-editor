// pattern: Functional Core

type ResizeCorner = 'top-left' | 'top-right' |
    'bottom-left' | 'bottom-right'

type ResizeDimensions = {
    readonly width:number
    readonly height:number
}

type ResizeMathOptions = {
    readonly corner:ResizeCorner
    readonly start:ResizeDimensions
    readonly freeForm:boolean
    readonly minWidth:number
    readonly minHeight:number
    readonly clientX:number
    readonly clientY:number
    readonly startX:number
    readonly startY:number
}

const DEFAULT_MINIMUM_DIMENSION = 50

export function normalizeMinimumDimension (value:number):number {
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_MINIMUM_DIMENSION
    }
    return Math.max(Math.round(value), 1)
}

export function getResizeDimensions (
    options:ResizeMathOptions
):ResizeDimensions {
    const {
        corner,
        start,
        freeForm,
        minWidth: configuredMinWidth,
        minHeight: configuredMinHeight,
        clientX,
        clientY,
        startX,
        startY
    } = options
    const minWidth = normalizeMinimumDimension(configuredMinWidth)
    const minHeight = normalizeMinimumDimension(configuredMinHeight)
    const horizontalDirection = corner.includes('right') ? 1 : -1
    const verticalDirection = corner.includes('bottom') ? 1 : -1
    const widthScale = (start.width +
        (clientX - startX) * horizontalDirection) / start.width
    const heightScale = (start.height +
        (clientY - startY) * verticalDirection) / start.height
    if (freeForm) {
        return {
            width: Math.max(Math.round(start.width +
                (clientX - startX) * horizontalDirection), minWidth),
            height: Math.max(Math.round(start.height +
                (clientY - startY) * verticalDirection), minHeight)
        }
    }

    const scale = widthScale < 1 && heightScale < 1
        ? Math.min(widthScale, heightScale)
        : Math.max(widthScale, heightScale)
    const minimumScale = Math.max(
        minWidth / start.width,
        minHeight / start.height
    )
    const safeScale = Math.max(scale, minimumScale)

    return {
        width: Math.round(start.width * safeScale),
        height: Math.round(start.height * safeScale)
    }
}
