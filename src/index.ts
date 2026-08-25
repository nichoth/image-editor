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
        this.replaceChildren(container)
    }
}

ImageEditor.define()
