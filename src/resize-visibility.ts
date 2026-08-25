// pattern: Functional Core

export type ResizeVisibility = 'hover' | 'always' | 'touch'

const RESIZE_VISIBILITY_VALUES:ReadonlySet<string> = new Set([
    'hover', 'always', 'touch'
])

export function normalizeResizeVisibility (
    value:string|null
):ResizeVisibility {
    if (value && RESIZE_VISIBILITY_VALUES.has(value)) {
        return value as ResizeVisibility
    }
    return 'touch'
}

export function shouldHideResizeAffordance (
    visibility:ResizeVisibility,
    touchDevice:boolean
):boolean {
    return visibility === 'hover' ||
        (visibility === 'touch' && !touchDevice)
}
