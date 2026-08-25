import { ImageEditor } from '../src/index.js'

if (import.meta.env.DEV || import.meta.env.MODE !== 'production') {
    localStorage.setItem('DEBUG', 'image-editor')
} else {
    localStorage.removeItem('DEBUG')
}

// `document.body.innerHTML +=` would serialize and re-parse the whole
// body, destroying and recreating every element already on the page.
document.body.insertAdjacentHTML(
    'beforeend',
    `<${ImageEditor.TAG}>
        <img src="/cinnamon-roll.jpg" width="320" alt="testing"></img>
    </${ImageEditor.TAG}>
    `
)

/**
 * Page level FOUCE -- reveal the page once every component is defined.
 */
await Promise.race([
    Promise.allSettled([
        customElements.whenDefined('image-editor')
    ]),
    new Promise(resolve => {
        setTimeout(resolve, 2000)
    })
])

document.documentElement.classList.remove('reduce-fouce')
