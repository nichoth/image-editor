// pattern: Imperative Shell

import {spawnSync} from 'node:child_process'

const isMinified = process.argv.includes('--minify')
const output = isMinified ? 'dist/index.min.css' : 'dist/index.css'
const command = process.platform === 'win32'
    ? 'lightningcss.cmd'
    : 'lightningcss'
const args = ['--bundle', '--nesting']

if (isMinified) args.push('--minify')
args.push('src/index.css', '-o', output)

const result = spawnSync(command, args, {stdio: 'inherit'})

if (result.error) throw result.error
if (result.status !== 0) process.exitCode = result.status ?? 1
