const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'get-content-type.js')
let sut = require(filePath)

test('Module is present', () => {
  assert.ok(sut, 'Content type module is present')
})

test('Content types', () => {
  // Not intended to be thorough, but just checking a handful of important ones to make sure things are good
  let type = sut('index.html')
  assert.strictEqual(type, 'text/html', `Got correct mime type for html: ${type}`)

  type = sut('something.json')
  assert.strictEqual(type, 'application/json', `Got correct mime type for json: ${type}`)

  type = sut('lol.gif')
  assert.strictEqual(type, 'image/gif', `Got correct mime type for image: ${type}`)

  type = sut('index.tsx')
  assert.strictEqual(type, 'text/tsx', `Got correct mime type for tsx file: ${type}`)

  type = sut('index.ts')
  assert.strictEqual(type, 'text/typescript', `Got correct mime type for ts file: ${type}`)

  type = sut('file')
  assert.strictEqual(type, 'application/octet-stream', `Got default for unknown file type: ${type}`)
})
