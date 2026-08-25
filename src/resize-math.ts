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
    readonly clientX:number
    readonly clientY:number
    readonly startX:number
    readonly startY:number
}

export function getResizeDimensions (
    options:ResizeMathOptions
):ResizeDimensions {
    const {
        corner,
        start,
        freeForm,
        clientX,
        clientY,
        startX,
        startY
    } = options
    const horizontalDirection = corner.includes('right') ? 1 : -1
    const verticalDirection = corner.includes('bottom') ? 1 : -1
    const widthScale = (start.width +
        (clientX - startX) * horizontalDirection) / start.width
    const heightScale = (start.height +
        (clientY - startY) * verticalDirection) / start.height
    if (freeForm) {
        return {
            width: Math.max(Math.round(start.width +
                (clientX - startX) * horizontalDirection), 1),
            height: Math.max(Math.round(start.height +
                (clientY - startY) * verticalDirection), 1)
        }
    }

    const scale = widthScale < 1 && heightScale < 1
        ? Math.min(widthScale, heightScale)
        : Math.max(widthScale, heightScale)
    const safeScale = Math.max(scale, 0.01)

    return {
        width: Math.round(start.width * safeScale),
        height: Math.round(start.height * safeScale)
    }
}
