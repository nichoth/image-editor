// pattern: Imperative Shell

import { WebComponent } from '@substrate-system/web-component'
import Debug from '@substrate-system/debug'

const debug = Debug('image-editor')

declare global {
    interface HTMLElementTagNameMap {
        'image-editor': ImageEditor
    }
}

export class ImageEditor extends WebComponent.create('image-editor') {
    #image:HTMLImageElement|null = null

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
        container.append(...createResizeHandles())
        this.replaceChildren(container)
    }
}

function createResizeHandles () {
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
        return handle
    })
}

ImageEditor.define()
