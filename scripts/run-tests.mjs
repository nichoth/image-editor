// pattern: Imperative Shell

import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TEST_TIMEOUT_MS = 5000
const TEST_IMAGE = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
    + '+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
)

async function readStdin () {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return Buffer.concat(chunks).toString('utf8')
}

function isIgnoredConsoleError (message) {
    return message.includes('Failed to load resource')
}

function reportConsoleMessage (message) {
    const text = message.text()
    const type = message.type()
    if (type === 'error') {
        console.error(text)
    } else {
        console.log(text)
    }
    return { text, type }
}

async function runTests (testCode) {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    let hasErrors = false
    let testsFinished = false

    page.on('console', message => {
        const result = reportConsoleMessage(message)
        if (result.text.startsWith('not ok ') ||
            result.text.startsWith('Unhandled ') ||
            result.text.includes('Error:')) {
            hasErrors = true
        }
        if (result.type === 'error' && !isIgnoredConsoleError(result.text)) {
            hasErrors = true
        }
        if (result.text === '# ok' || result.text.startsWith('# fail ')) {
            testsFinished = true
        }
    })
    page.on('pageerror', error => {
        console.error(`Page error: ${error.message}`)
        hasErrors = true
        testsFinished = true
    })

    try {
        await page.route('**/image.jpg', route => route.fulfill({
            contentType: 'image/png',
            body: TEST_IMAGE
        }))
        const originPath = resolve(
            process.cwd(), 'scripts', 'test-document.html'
        )
        const originFile = pathToFileURL(originPath).href
        await page.goto(originFile)
        await page.setContent('<!doctype html><html><body></body></html>')
        await page.addScriptTag({ content: testCode })

        const deadline = Date.now() + TEST_TIMEOUT_MS
        while (Date.now() < deadline && !testsFinished) {
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        if (Date.now() >= deadline) {
            throw new Error('Tests timed out')
        }
        if (hasErrors) throw new Error('Tests failed')
    } finally {
        await browser.close()
    }
}

try {
    const testCode = await readStdin()
    if (!testCode.trim()) throw new Error('No test code provided')
    await runTests(testCode)
} catch (error) {
    console.error('Error running tests:', error)
    process.exitCode = 1
}
